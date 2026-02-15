//+------------------------------------------------------------------+
//| Time Based Reverse Strategy EA with API Integration (MT5)       |
//| Time: 15:25, TF: M5 with Real-time API Logging                  |
//+------------------------------------------------------------------+
#property strict
#include <Trade\Trade.mqh>

CTrade trade;

// Inputs
input string  API_URL = "http://localhost:3000/api/trades";  // Your API endpoint
input double  LotSize = 0.10;
input int     TradeHour = 15;
input int     TradeMinute = 25;
input int     StopLossPips = 10;
input int     TakeProfitPips = 40;

datetime lastTradeDay = 0;
ulong lastTicket = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   // Enable WebRequest for your API URL
   // IMPORTANT: Add this URL to Tools -> Options -> Expert Advisors -> 
   // "Allow WebRequest for listed URL:" in MT5
   Print("EA Initialized. API URL: ", API_URL);
   Print("IMPORTANT: Make sure ", API_URL, " is allowed in WebRequest settings!");
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   // Use only on M5
   if(_Period != PERIOD_M5) return;
   
   datetime currentTime = TimeCurrent();
   MqlDateTime timeStruct;
   TimeToStruct(currentTime, timeStruct);
   
   // Check if already traded today
   if(lastTradeDay == DateOfDay(currentTime)) 
   {
      // Check for position update
      if(lastTicket > 0)
         CheckPositionUpdate();
      return;
   }
   
   // Check time = 15:25
   if(timeStruct.hour == TradeHour && timeStruct.min == TradeMinute)
   {
      ExecuteTrade();
      lastTradeDay = DateOfDay(currentTime);
   }
}

//+------------------------------------------------------------------+
//| Return only date (without time)                                   |
//+------------------------------------------------------------------+
datetime DateOfDay(datetime t)
{
   MqlDateTime s;
   TimeToStruct(t, s);
   s.hour = 0;
   s.min = 0;
   s.sec = 0;
   return StructToTime(s);
}

//+------------------------------------------------------------------+
//| Execute Trade with API Logging                                    |
//+------------------------------------------------------------------+
void ExecuteTrade()
{
   // Get previous closed candle (index 1)
   double open = iOpen(_Symbol, PERIOD_M5, 1);
   double close = iClose(_Symbol, PERIOD_M5, 1);
   double point = _Point;
   double pip = point * 10;
   double sl, tp;
   
   string tradeType = "";
   double price = 0;
   bool success = false;
   
   // If previous candle bullish → SELL
   if(close > open)
   {
      price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      sl = price + StopLossPips * pip;
      tp = price - TakeProfitPips * pip;
      
      if(trade.Sell(LotSize, _Symbol, price, sl, tp, "Reverse Sell"))
      {
         tradeType = "SELL";
         lastTicket = trade.ResultOrder();
         success = true;
      }
   }
   // If previous candle bearish → BUY
   else if(close < open)
   {
      price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      sl = price - StopLossPips * pip;
      tp = price + TakeProfitPips * pip;
      
      if(trade.Buy(LotSize, _Symbol, price, sl, tp, "Reverse Buy"))
      {
         tradeType = "BUY";
         lastTicket = trade.ResultOrder();
         success = true;
      }
   }
   
   // Send trade data to API
   if(success && lastTicket > 0)
   {
      SendTradeToAPI(lastTicket, tradeType, price, sl, tp, "OPEN");
   }
}

//+------------------------------------------------------------------+
//| Check for position updates (TP/SL hit)                            |
//+------------------------------------------------------------------+
void CheckPositionUpdate()
{
   if(lastTicket == 0) return;
   
   // Check if position still exists
   if(!PositionSelectByTicket(lastTicket))
   {
      // Position closed - check history
      if(HistorySelectByPosition(lastTicket))
      {
         int deals = HistoryDealsTotal();
         for(int i = deals - 1; i >= 0; i--)
         {
            ulong dealTicket = HistoryDealGetTicket(i);
            if(dealTicket > 0)
            {
               if(HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID) == lastTicket)
               {
                  long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
                  
                  // Only process exit deals (DEAL_TYPE_SELL for closing buy, DEAL_TYPE_BUY for closing sell)
                  if(dealType == DEAL_TYPE_BUY || dealType == DEAL_TYPE_SELL)
                  {
                     double exitPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
                     double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
                     
                     // Update trade via API
                     UpdateTradeToAPI(lastTicket, exitPrice, profit);
                     lastTicket = 0; // Reset
                     break;
                  }
               }
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send new trade to API                                             |
//+------------------------------------------------------------------+
void SendTradeToAPI(ulong ticket, string type, double entry, double sl, double tp, string status)
{
   string headers = "Content-Type: application/json\r\n";
   char post[];
   char result[];
   string resultHeaders;
   
   // Get current date/time
   datetime now = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(now, dt);
   
   // Format date as YYYY-MM-DD
   string dateStr = StringFormat("%04d-%02d-%02d", dt.year, dt.mon, dt.day);
   string timeStr = StringFormat("%02d:%02d", dt.hour, dt.min);
   
   // Create JSON payload
   string json = StringFormat(
      "{\"ticket\":%I64u,\"date\":\"%s\",\"time\":\"%s\",\"type\":\"%s\",\"symbol\":\"%s\",\"lotSize\":%.2f,\"entry\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"status\":\"%s\",\"isBacktest\":%s}",
      ticket,
      dateStr,
      timeStr,
      type,
      _Symbol,
      LotSize,
      entry,
      sl,
      tp,
      status,
      MQLInfoInteger(MQL_TESTER) ? "true" : "false"
   );
   
   StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1); // Remove null terminator
   
   int timeout = 5000; // 5 seconds
   int res = WebRequest("POST", API_URL, headers, timeout, post, result, resultHeaders);
   
   if(res == 200)
   {
      Print("✓ Trade sent to API successfully. Ticket: ", ticket);
   }
   else if(res == -1)
   {
      Print("✗ WebRequest error. Make sure URL is allowed in Tools->Options->Expert Advisors");
      Print("Add this URL: ", API_URL);
   }
   else
   {
      Print("✗ API Error. Response code: ", res);
   }
}

//+------------------------------------------------------------------+
//| Update closed trade to API                                        |
//+------------------------------------------------------------------+
void UpdateTradeToAPI(ulong ticket, double exitPrice, double profit)
{
   string headers = "Content-Type: application/json\r\n";
   char post[];
   char result[];
   string resultHeaders;
   
   string status = (profit > 0) ? "WIN" : "LOSS";
   
   // Create JSON payload for update
   string json = StringFormat(
      "{\"ticket\":%I64u,\"exit\":%.5f,\"pnl\":%.2f,\"status\":\"%s\"}",
      ticket,
      exitPrice,
      profit,
      status
   );
   
   StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1);
   
   string updateURL = API_URL + "/" + IntegerToString(ticket);
   
   int timeout = 5000;
   int res = WebRequest("PUT", updateURL, headers, timeout, post, result, resultHeaders);
   
   if(res == 200)
   {
      Print("✓ Trade updated in API. Ticket: ", ticket, " | Profit: $", profit);
   }
   else
   {
      Print("✗ Failed to update trade. Response: ", res);
   }
}
//+------------------------------------------------------------------+
