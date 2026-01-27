#!/bin/bash
# Script để thiết lập timezone cho database đã chạy
# Chạy script này TRONG container PostgreSQL:
# docker exec -it swp-postgres bash -c "psql -U postgres -d fuel_management -f /tmp/set-timezone.sql"

-- Thiết lập timezone mặc định cho database
ALTER DATABASE fuel_management SET timezone TO 'Asia/Ho_Chi_Minh';

-- Kiểm tra timezone hiện tại
SHOW timezone;

-- Kiểm tra thời gian hiện tại với timezone Việt Nam
SELECT 
  NOW() as current_time_vietnam,
  NOW() AT TIME ZONE 'UTC' as utc_time,
  NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh' as vietnam_time;

-- Hiển thị thông tin
SELECT 'Timezone đã được thiết lập thành công!' as message;
