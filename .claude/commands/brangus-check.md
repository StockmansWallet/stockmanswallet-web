# Brangus AI Chat Check

Audit the web Brangus (Brangus) chat system for correctness, safety, and alignment with iOS.

## Key Files
- `lib/brangus/chat-service.ts` - System prompt, API calls, tool loop
- `lib/brangus/tools.ts` - Tool definitions and execution
- `app/(app)/dashboard/brangus/chat/page.tsx` - Chat UI

## Check
1. System prompt matches iOS persona and rules (no fabrication, no "mob", mandatory data lookup)
2. Tool definitions match iOS (lookup_portfolio_data, calculate_freight, create/manage_yard_book_event)
3. sanitiseResponse() strips em-dashes and replaces "mob" with "herd"
4. Price maps use /100 conversion (cents to dollars)
5. Tool loop handles multiple tool_use blocks correctly
6. Error handling for API failures
7. Model whitelist matches brangus-chat Edge Function server-side enforcement

## Output
Checklist with PASS/FAIL for each item. Flag any iOS drift.
