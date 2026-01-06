import pandas as pd
import os

file_path = '/home/seth/WorkSpace/SWP/mau so/rptTongHopCN.xlsx'

print(f"\n--- Analyzing {os.path.basename(file_path)} ---")
try:
    df = pd.read_excel(file_path, header=None, skiprows=8, nrows=5)
    print(df.to_string())
except Exception as e:
    print(f"Error: {e}")
