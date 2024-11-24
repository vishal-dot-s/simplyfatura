
import cv2 as cv
import numpy as np
from PIL import Image
import pytesseract
import re
import cv2 
import numpy as np
import skimage.filters as filters
import easyocr

def process_image_for_ocr(image_path, output_path):
    src = cv.imread(image_path)
    if src is None:
        print(f"Error: Unable to read image from {image_path}.")
        return

    gray = cv.cvtColor(src, cv.COLOR_BGR2GRAY)
    dst = cv.fastNlMeansDenoising(gray, h=9, templateWindowSize=7, searchWindowSize=21)
    angle = detect_skew_angle(dst)
    deskewed = rotate_image(dst, angle)

    if deskewed is None:
        deskewed = gray

    deskewed = cv.equalizeHist(deskewed)
    clahe = cv.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    deskewed = clahe.apply(deskewed)

    dsize = (deskewed.shape[1] * 2, deskewed.shape[0] * 2)
    deskewed = cv.resize(deskewed, dsize, interpolation=cv.INTER_CUBIC)
    deskewed = cv.convertScaleAbs(deskewed, alpha=2.0, beta=0)

    dst = cv.adaptiveThreshold(deskewed, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 35, 17)


    sharpen_kernel = np.array([[0, -1, 0], [-1, 6, -1], [0, -1, 0]])
    dst = cv.filter2D(dst, -1, sharpen_kernel)

    kernel = cv.getStructuringElement(cv.MORPH_RECT, (1, 1))
    dst = cv.morphologyEx(dst, cv.MORPH_CLOSE, kernel)

    cv.imwrite(output_path, dst)

def detect_skew_angle(src):
    moments = cv.moments(src)
    if abs(moments["mu02"]) < 1e-2:
        return 0
    skew = moments["mu11"] / moments["mu02"]
    angle = np.arctan(skew) * 180 / np.pi
    return angle

def rotate_image(src, angle):
    center = (src.shape[1] // 2, src.shape[0] // 2)
    rotation_matrix = cv.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv.warpAffine(src, rotation_matrix, (src.shape[1], src.shape[0]), flags=cv.INTER_LINEAR)
    return rotated



def extract_text_from_image(image_path):
    try:
        img = Image.open(image_path)
        custom_config = r'--oem 3 --psm 4 --dpi 300 -c tessedit_char_whitelist="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz€$.,:/%- "'
        text = pytesseract.image_to_string(img,config=custom_config,lang="eng")
        print(text)
        return text
    except Exception as e:
        return f"Error processing image: {e}"

def process_text_amancher(text):
    # Step 2: Initialize the result dictionary
    invoice_details = {}

    # Step 3: Extract invoice number
    # Adjust regex to handle noisy OCR results (e.g., Fs or 7472¢)
    invoice_number_match = re.search(r'original\s+(FS\s*[A-Z0-9/]+)', text, re.IGNORECASE)
    invoice_details['InvoiceNumber'] = invoice_number_match.group(1) if invoice_number_match else "Not Found"

    # Step 4: Extract date and time
    date_match = re.search(r'\d{4}-\d{2}-\d{2}', text)
    time_match = re.search(r'\d{2}:\d{2}', text)
    invoice_details['Date'] = date_match.group(0) if date_match else "Not Found"
    invoice_details['Time'] = time_match.group(0) if time_match else "Not Found"

    # Step 5: Extract items
    items = []
    lines = text.splitlines()
    for line in lines:
        # Regex for items
        # Matches both "1 Uni BOLACHA AMANHEC 23% 1,09" and "1,43 KG BAT CONS SEL P/ 6% 2,13"
        match = re.match(r'(\d+(?:,\d+)?)\s+(?:Uni|KG)\s+(.+?)\s+(\d+%)\s+([\d,]+)', line)
        if match:
            quantity = match.group(1).replace(',', '.')
            description = match.group(2)
            tax = match.group(3)
            price = match.group(4).replace(',', '.')
            items.append({
                "Quantity": float(quantity),
                "Description": description.strip(),
                "Tax": tax,
                "Price": float(price),
            })

    invoice_details['Items'] = items

    # Step 6: Extract total value
    # Match the total amount
    total_match = re.search(r'TOTAL:\s*([\d,]+)\s*€', text, re.IGNORECASE)
    invoice_details['Total'] = float(total_match.group(1).replace(',', '.')) if total_match else "Not Found"

    return invoice_details
