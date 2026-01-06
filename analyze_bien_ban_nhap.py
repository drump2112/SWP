import pandas as pd
import os

file_path = '/home/seth/WorkSpace/SWP/mau so/Bien ban giao nhan xang dau CHBL.xlsx'

print(f"\n{'='*80}")
print(f"PHÂN TÍCH CHI TIẾT: {os.path.basename(file_path)}")
print(f"{'='*80}\n")

try:
    # Đọc toàn bộ file Excel với header=None để xem raw structure
    df = pd.read_excel(file_path, header=None)

    print(f"📊 Tổng số dòng: {len(df)}")
    print(f"📊 Tổng số cột: {len(df.columns)}\n")

    print("="*80)
    print("CẤU TRÚC FILE - TỪNG DÒNG")
    print("="*80)

    # In chi tiết 40 dòng đầu tiên
    for index, row in df.iterrows():
        if index >= 40:  # Chỉ xem 40 dòng đầu
            break

        # Lọc các giá trị không null
        row_content = []
        for col_idx, value in enumerate(row):
            if pd.notna(value):
                row_content.append(f"Col{col_idx}: '{value}'")

        if row_content:
            print(f"\n📍 Dòng {index}:")
            for content in row_content:
                print(f"   {content}")

    print("\n" + "="*80)
    print("PHÂN TÍCH CỘT")
    print("="*80)

    # Phân tích từng cột
    for col_idx in range(len(df.columns)):
        non_null_values = df[col_idx].dropna()
        if len(non_null_values) > 0:
            print(f"\n📌 Cột {col_idx}:")
            print(f"   - Số giá trị: {len(non_null_values)}")
            print(f"   - Giá trị đầu tiên: {non_null_values.iloc[0]}")
            if len(non_null_values) > 1:
                print(f"   - Giá trị thứ 2: {non_null_values.iloc[1]}")
            if len(non_null_values) > 2:
                print(f"   - Giá trị thứ 3: {non_null_values.iloc[2]}")

    print("\n" + "="*80)
    print("TÌM HEADER TABLE (Dòng có nhiều giá trị)")
    print("="*80)

    # Tìm dòng có nhiều cell có giá trị (có thể là header)
    for index, row in df.iterrows():
        non_null_count = row.notna().sum()
        if non_null_count >= 5:  # Dòng có ít nhất 5 cột có giá trị
            print(f"\n📋 Dòng {index} ({non_null_count} cột có dữ liệu):")
            for col_idx, value in enumerate(row):
                if pd.notna(value):
                    print(f"   Col{col_idx}: {value}")

    print("\n" + "="*80)
    print("THÔNG TIN KIỂU DỮ LIỆU")
    print("="*80)
    print(df.dtypes)

except Exception as e:
    print(f"❌ Lỗi: {e}")
    import traceback
    traceback.print_exc()
