import hashlib
from flask import Flask, json, redirect, request, send_from_directory, render_template, jsonify, session, url_for
import os
import secrets
from flask_wtf.csrf import CSRFProtect
from database import Group, Notification, User, UserNotificationStatus, accept_join_request, create_groupdb, fetch_user_join_requests, get_group_members, get_unread_notifications_for_user, mark_notifications_as_read, save_user,authenticate_user, search_users, send_join_request
from image_processing import process_image_for_ocr, extract_text_from_image, process_text_amancher
from db import db
from flask_cors import CORS
from sqlalchemy.orm import joinedload
import subprocess
app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = './uploads/process'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# Set a maximum upload size
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB limit
app.secret_key = secrets.token_hex(16) 
csrf = CSRFProtect(app)  # Initialize CSRF protection
CORS(app)


app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:newpassword@localhost/user_management'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
csrf.init_app(app)

def format_quantities_as_floats(data):
    for item in data.get("items", []):
        item["quantity"] = float(item["quantity"])
    return data

def format_prices_as_floats(data, precision=2):
    for item in data.get("items", []):
        item["price"] = round(float(item["price"]), precision)
    return data

@app.route('/uploads', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    processed_filename = 'processed_' + file.filename
    processed_file_path = os.path.join(PROCESSED_FOLDER, processed_filename)

    # Define input and output file path
    process_image_for_ocr(file_path, processed_file_path)
    text = extract_text_from_image(processed_file_path)
    output = process_text_amancher(text)
    output = format_quantities_as_floats(output)
    output = format_prices_as_floats(output)
    # Convert OCR data to JSON string and hash it
    ocr_data_string = json.dumps(output, sort_keys=True,separators=(',', ':'), ensure_ascii=False)
    ocr_hash = hashlib.sha256(ocr_data_string.encode('utf-8')).hexdigest()
    # Store the hash in the session
    print('upload ocrdata :',ocr_data_string)
    print('upload ocr hash :',ocr_hash)
    session['ocr_hash'] = ocr_hash
    # Send OCR data (without the hash) to the frontend
    return jsonify({'message': 'File uploaded and processed', 'data': output}), 200

@app.route('/submit-invoice', methods=['POST'])
def submit_invoice():
    data = request.json
    ocr_data = format_quantities_as_floats(data.get("ocr_data"))
    ocr_data = format_prices_as_floats(ocr_data)
    # Serialize OCR data and compute hash to compare with session
    submitted_ocr_data_string = json.dumps(ocr_data, sort_keys=True,separators=(',', ':'), ensure_ascii=False)
    submitted_ocr_hash = hashlib.sha256(submitted_ocr_data_string.encode('utf-8')).hexdigest()
    # Check if OCR data has been modified
    print('submit ocrdata :',submitted_ocr_data_string)
    print('submited ocr hash :',submitted_ocr_hash)
    if submitted_ocr_hash != session.get('ocr_hash'):
        return jsonify({'status': 'error', 'message': 'OCR data has been modified and cannot be submitted.'}), 400

    # Proceed if OCR data is unchanged
    ocr_data = data['ocr_data']
    user_items = data['user_items']
    personal_indices = data['ps']

    # Combine OCR items and user-added items
    combined_items = ocr_data['items'] + user_items

    # Start with the original total from OCR data
    total = ocr_data['total']

    filtered_items = []

    # Filter items and adjust the total based on personal indices
    for index, item in enumerate(combined_items):
        if index in personal_indices:
            # If the item is marked as personal, subtract its price from the total
            total -= item['price']
        else:
            # Otherwise, keep the item in the filtered list
            filtered_items.append(item)

    # Output filtered items and updated total
    print("filtered_items:", filtered_items)
    print("Total:", total)

    return jsonify({'status': 'success', 'message': 'Invoice submitted and verified successfully.'}), 200

@app.route('/signup', methods=['POST'])
def signup():
    print(request.content_type)  # Log content type

    # Since the content-type is application/x-www-form-urlencoded, use request.form
    name = request.form.get('name')
    email = request.form.get('email')
    password = request.form.get('password')

    # Ensure all fields are provided
    if not name or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400

    # Example function to save the user (you need to implement this)
    result = save_user(name, email, password)
    
    if result['status'] == 'success':
        return jsonify(result), 200
    else:
        return jsonify(result), 200

@app.route('/signin', methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')

    # Check if user exists and password is correct
    user = authenticate_user(email,password)
    if user['status'] == 'success':
        print("user login...")
        session['user'] = user['user']
        # has_group = Group.query.filter_by(id=user['user']['id']).first() is not None
        return jsonify({'success': True, 'user': user['user']})  # User data in JSON format
    
    return jsonify({'success': False, 'message': user['message']}), 401

@app.route('/logout')
def logout():
    # Clear all session data
    session.clear()  # You can also use session.pop('key') to remove specific data
    
    # Redirect the user to the login page or home page after logging out
    return redirect(url_for('display_login'))
    
@app.route('/dashboard',methods=['GET'])
def dashboard():
    # Check if user is logged in by checking session
    if 'user' not in session:
        return redirect(url_for('display_login'))  # Redirect to login if not logged in

    # Get user information from the session
    user = session['user']

    return render_template('dashboard.html', user=user)



@app.route('/group/<int:group_id>/manage', methods=['POST'])
def manage_group(group_id):
    action = request.json.get('action')
    
    # if not has_permission(group_id, action):
    #     return jsonify({"error": "Unauthorized"}), 403
    
    # Process the specific action
    if action == 'add_user':
        user_id = request.json.get('user_id')
        # Add user to the group logic here
        # e.g., add_user_to_group(user_id, group_id)
        return jsonify({"success": f"User {user_id} added to group {group_id}."})
    
    elif action == 'remove_user':
        user_id = request.json.get('user_id')
        # Remove user from the group logic here
        # e.g., remove_user_from_group(user_id, group_id)
        return jsonify({"success": f"User {user_id} removed from group {group_id}."})
    
    elif action == 'add_item':
        item_data = request.json.get('item_data')
        # Add item to the group logic here
        # e.g., add_item_to_group(item_data, group_id)
        return jsonify({"success": f"Item added to group {group_id}."})
    
    # Handle other future actions
    # elif action == 'other_action':
    # Handle other actions
    
    return jsonify({"error": "Action not recognized"}), 400


@app.route('/group/create', methods=['POST'])
def create_group():
    # Check if the user is logged in
    if 'user' not in session:
        return redirect(url_for('display_login'))  # Redirect to login if not logged in

    user = session['user']
    name = request.json.get('name')

    # Check if a group with the given name already exists
    if Group.query.filter_by(name=name).first():
        return jsonify({"error": "A group with this name already exists."}), 400

    # Call create_groupdb function and handle the result
    result, status_code = create_groupdb(user['id'], name)
    if not result['success']:
        # Return error message if the group creation failed
        return jsonify({"error": result['message']}), status_code
    
    # If group creation was successful
    return jsonify({"success": True, "message": result['message'], "group_id": result.get("group_id")}), 200




@app.route('/group/searchUser', methods=['POST'])
def search_user_route():
    data = request.get_json()
    query = data.get('query', '').strip()
    page = int(data.get('page', 1))  # Convert to int after retrieving the value
    per_page = int(data.get('per_page', 10)) 

    if not query:
        return jsonify({'success': False, 'message': 'Search query is required'}), 400

    # Call the separated database function
    result = search_users(query, page, per_page)

    # Check if the database function executed successfully
    if result['success']:
        return jsonify(result)
    else:
        return jsonify({'success': False, 'message': result.get('error', 'An error occurred')}), 500
    

@app.route('/send_join_request', methods=['POST'])
def send_join_request_route():
    """Endpoint for group admins to send join requests to a user."""
    
    data = request.get_json()  # Parse JSON payload
    admin_id = data.get('admin_id')
    target_user_id = data.get('target_user_id')
    group_id = data.get('group_id')
    
    # Ensure required fields are provided
    if not all([admin_id, target_user_id, group_id]):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    # Call the send_join_request function and get the result
    result = send_join_request(admin_id, target_user_id, group_id)
    
    # Return the result as a JSON response
    status_code = 200 if result['success'] else 400
    return jsonify(result), status_code


@app.route('/api/user/<int:user_id>/join-requests', methods=['GET'])
def get_user_join_requests(user_id):
    """Route to fetch pending join requests for a specific user."""
    result = fetch_user_join_requests(user_id)
    return jsonify(result[0]), result[1]

@app.route('/api/join-request/accept', methods=['POST'])
def accept_join_request_route():
    # Get JSON data from the request
    data = request.json
    user_id = data.get("user_id")
    request_id = data.get("request_id")
    
    # Call the function to process the request
    result = accept_join_request(user_id, request_id)
    return jsonify(result)


@app.route('/api/group/<string:group_id>/members', methods=['GET'])
def fetch_group_members(group_id):
    """API endpoint to get members of a group."""
    result = get_group_members(group_id)
    return jsonify(result)



@app.route('/api/notifications/unread', methods=['GET'])
def get_unread_notifications():
    user = session.get('user')  # Assuming function to get current user’s ID

    if not user:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    return get_unread_notifications_for_user(user['id'])

@app.route('/notifications/mark_as_read', methods=['POST'])
def mark_notifications_as_read_route():
    user = session['user']

    if not user:
       return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.get_json()
    notification_ids = data.get('notification_ids', [])

    if not notification_ids:
        return jsonify({"success": False, "message": "No notification IDs provided"}), 400

    # Call the function to mark notifications as read
    response = mark_notifications_as_read(user_id=user['id'], notification_ids=notification_ids)
    
    return jsonify(response)

@app.route('/displayInvoiceitem',methods=['GET'])
def display_invoice_item():
    return render_template('displayInvoiceitem.html')

@app.route('/signin')
def display_login():
    return render_template('signin.html')

@app.route('/ManageGroup',endpoint='ManageGroup')
def display_Group():
     if 'user' not in session:
        return redirect(url_for('display_login'))
     
     user= session['user']
     group_id = user['group_id'] if user else None
     return render_template('ManageGroup.html',user=user,group_id=group_id)

@app.route('/GrocceryList',endpoint='GrocceryList')
def display():
        if 'user' not in session:
         return redirect(url_for('display_login'))
        
        user= session['user']
        return render_template('GrocceryList.html',user=user)

@app.route('/static/<path:filename>')
def send_static(filename):
    return send_from_directory('static', filename)

@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)