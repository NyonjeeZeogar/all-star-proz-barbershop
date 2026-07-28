-- Replace calculate_booking_pricing()

-- Deposit = 50% of service subtotal
-- Charged today = deposit + booking fee + tip
-- Remaining balance = subtotal - deposit

-- Verify:
-- select * from public.calculate_booking_pricing(4000,0,0,'deposit');
-- deposit_cents = 2000
-- booking_fee_cents = 150
-- charged_today_cents = 2150
-- remaining_balance_cents = 2000
