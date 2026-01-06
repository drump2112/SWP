import pandas as pd
import os

file_path = '/home/seth/WorkSpace/SWP/mau so/rptTHNopTien.xlsx'

print(f"\n--- Analyzing {os.path.basename(file_path)} ---")
try:
    df = pd.read_excel(file_path, header=None, nrows=15)
    for index, row in df.iterrows():
        row_content = [str(x) for x in row if pd.notna(x)]
        if row_content:
            print(f"Row {index}: {row_content}")
except Exception as e:
    print(f"Error: {e}")
