import pandas as pd
import os

folder_path = '/home/seth/WorkSpace/SWP/mau so'
files_to_check = [
    'BangKeBanHang.xlsx',
    'rptTongHopCN.xlsx',
    'rptTHNopTien.xlsx',
    'ChiTietCN.xlsx'
]

for file_name in files_to_check:
    file_path = os.path.join(folder_path, file_name)
    if os.path.exists(file_path):
        print(f"\n--- Analyzing {file_name} ---")
        try:
            # Read the first 10 rows to find headers
            df = pd.read_excel(file_path, header=None, nrows=10)
            print(df.to_string())
        except Exception as e:
            print(f"Error reading {file_name}: {e}")
    else:
        print(f"\nFile not found: {file_name}")
