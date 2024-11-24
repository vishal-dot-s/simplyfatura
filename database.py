from datetime import datetime
from uuid import uuid4

from flask import jsonify
from db  import db
from werkzeug.security import generate_password_hash,check_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
from sqlalchemy.exc import SQLAlchemyError




class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.String(36), db.ForeignKey('groups.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    group = db.relationship('Group', backref=db.backref('notifications', lazy=True))
    users = db.relationship('User', secondary='user_notification_status', backref=db.backref('notifications', lazy=True))

    def to_dict(self):
        """Converts the Notification object into a dictionary."""
        return {
            'id': self.id,
            'group_id': self.group_id,
            'message': self.message,
            'created_at': self.created_at.isoformat()  # Convert datetime to ISO format
        }

class UserNotificationStatus(db.Model):
    __tablename__ = 'user_notification_status'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    notification_id = db.Column(db.Integer, db.ForeignKey('notifications.id'), nullable=False)
    seen = db.Column(db.Boolean, default=False)

    user = db.relationship('User', backref=db.backref('notification_status', lazy=True))
    notification = db.relationship('Notification', backref=db.backref('statuses', lazy=True))

class GroupJoinRequest(db.Model):
    __tablename__ = 'group_join_requests'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.String(36), db.ForeignKey('groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    join_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="pending")  # pending, accepted, rejected

    group = db.relationship('Group', backref=db.backref('join_requests', lazy=True))
    user = db.relationship('User', backref=db.backref('join_requests', lazy=True))

    def to_dict(self):
        """Converts the GroupJoinRequest object into a dictionary."""
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'join_at': self.join_at.isoformat(),  # Convert datetime to ISO format
            'status': self.status,
            'group': self.group.name if self.group else None,  # Optional: include group name
            'user': self.user.name if self.user else None,     # Optional: include user name
        }
    
class Group(db.Model):
    __tablename__ = 'groups'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))  # UUID as primary key
    name = db.Column(db.String(100), nullable=False, unique=True)  # Group names should be unique
    users = db.relationship('User', backref='group', lazy=True, cascade="all, delete-orphan")  # Relationship to users in this group

    def __repr__(self):
        return f"<Group {self.name}>"


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)  # Storing a hashed password for security
    group_id = db.Column(db.String(36), db.ForeignKey('groups.id'), nullable=True)  # ForeignKey to group
    role = db.Column(db.String(20), default="member")  # Role within the group (admin/member)
    join_date = db.Column(db.DateTime, nullable=True) 

    def is_in_group(self):
     return self.group_id is not None

    def __repr__(self):
        return f"<User {self.name}, Role: {self.role}, Group: {self.group_id}>"

    def set_password(self, password):
        """Hashes the password and stores it in password_hash."""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Checks the hashed password."""
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Converts the User object into a dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'group_id': self.group_id,
            'join_date':self.join_date
        }


def save_user(name, email, password):
    """Saves a user to the database and returns a message."""
    hashed_password = generate_password_hash(password)
    new_user = User(name=name, email=email, password=hashed_password)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return {'status': 'success', 'message': 'User signed up successfully'}
    
    except IntegrityError as e:
        db.session.rollback()
        if "Duplicate entry" in str(e):
            return {'status': 'error', 'message': 'This email is already registered'}
        else:
            return {'status': 'error', 'message': f"Error saving user: {e}"}


def authenticate_user(email, password):
    """Authenticates a user by checking their email and password."""
    # Query the user by email
    user = User.query.filter_by(email=email).first()
    
    # Check if user exists and password is correct
    if user and check_password_hash(user.password, password):  # Correct the attribute to password_hash
        return {'status': 'success', 'message': 'User authenticated successfully', 'user':  user.to_dict()}
    else:
        return {'status': 'error', 'message': 'Invalid email or password', 'user': None}
    
def create_groupdb(user_id, group_name):
    try:
        # Fetch the user who is creating the group
        user = User.query.get(user_id)
        if not user:
            return {"success": False, "message": "User not found"}, 404

        # Check if the user is already in a group
        if user.group_id:
            return {"success": False, "message": "User has already created or joined a group"}, 400

        # Check if a group with the same name already exists
        existing_group = Group.query.filter_by(name=group_name).first()
        if existing_group:
            return {"success": False, "message": "A group with this name already exists"}, 400

        # Create a new group if the user hasn't created one yet
        new_group = Group(name=group_name)
        db.session.add(new_group)
        db.session.commit()

        # Assign the user as the admin of the new group
        user.group_id = new_group.id
        user.role = "admin"
        user.join_date = datetime.utcnow()
        db.session.commit()

        return {"success": True, "message": "Group created successfully", "group_id": new_group.id}, 200

    except Exception as e:
        db.session.rollback()  # Roll back the transaction if any error occurs
        return {"success": False, "message": f"An error occurred: {str(e)}"}, 500
    
def search_users(query, page=1, per_page=10):
    """Searches for users by name or email with pagination."""
    try:
        # Query for users by name or email with case-insensitive matching
        users_query = User.query.filter(
            (User.name.ilike(query)) | (User.email.ilike(query))
        )
        
        # Paginate the query results
        paginated_users = users_query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Check if users were found
        if not paginated_users.items:
            return {
                'success': True,
                'data': [],  # Return an empty list for the data
                'page': paginated_users.page,
                'pages': paginated_users.pages,
                'total': paginated_users.total,
                'message': 'No users found matching your query.'
            }
        
        # Format results for JSON response
        results = [{
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'group_id': user.group_id,
            'group_name': user.group.name if user.group else None,
            'role': user.role
        } for user in paginated_users.items]
        
        return {
            'success': True,
            'data': results,
            'page': paginated_users.page,
            'pages': paginated_users.pages,
            'total': paginated_users.total
        }
    
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': f'Error querying users: {str(e)}'}
    

def send_join_request(admin_id, target_user_id, group_id):
    try:
        # Get the admin user and verify their role and group association
        admin = User.query.get(admin_id)
        if not admin or admin.role != 'admin' or admin.group_id != group_id:
            return {'success': False, 'message': 'Unauthorized: Only group admins can send join requests.'}

        # Ensure the target user exists
        target_user = User.query.get(target_user_id)
        if not target_user:
            return {'success': False, 'message': 'Target user not found'}

        # Check if a pending or active request already exists
        existing_request = GroupJoinRequest.query.filter_by(
            group_id=group_id,
            user_id=target_user_id,
            status='pending'
        ).first()
        
        if existing_request:
            return {'success': False, 'message': 'A pending join request already exists for this user.'}
        
        # Create a new join request
        new_request = GroupJoinRequest(group_id=group_id, user_id=target_user_id, status='pending')
        db.session.add(new_request)
        db.session.commit()

        return {'success': True, 'message': 'Join request sent successfully'}
    
    except Exception as e:
        db.session.rollback()  # Roll back transaction on error
        return {'success': False, 'message': f'Error: {str(e)}'}

def accept_join_request(user_id, request_id):
    """Allows a user to accept a join request to join a group."""
    try:
        # Retrieve join request and user from the database
        join_request = GroupJoinRequest.query.get(request_id)
        user = User.query.get(user_id)

        # Ensure the request and user exist, and the user is the recipient of the request
        if not join_request:
            return {'success': False, 'message': 'Join request not found'}
        
        if not user:
            return {'success': False, 'message': 'User not found'}

        # Ensure the request is still pending
        if join_request.status != "pending":
            return {'success': False, 'message': 'Request is no longer pending'}

        # Ensure the request is for the correct user
        if join_request.user_id != user.id:
            return {'success': False, 'message': 'User ID does not match the join request'}

        # Update user's group and role
        user.group_id = join_request.group_id  # Assign the user to the group specified in the join request
        user.role = "member"  # Assign a default role
        user.join_date = datetime.utcnow()  # Set the join date to current datetime

        # Update join request status to "accepted"
        join_request.status = "accepted"

        # Save changes
        
        add_group_member(user.id,join_request.group_id)

        db.session.commit()
        return {'success': True, 'message': 'Join request accepted successfully'}

    except Exception as e:
        print(e)
        db.session.rollback()  # Rollback transaction in case of an error
        return {'success': False, 'message': f'Error: {str(e)}'}
    


def delete_group(user_id, group_id):
    """Allows a group admin to delete the group only if today is the 1st of the month."""
    try:
        # Check if today is the 1st of the month
        if datetime.utcnow().day != 1:
            return {"success": False, "message": "Group deletion is only allowed on the 1st of the month"}, 403

        # Fetch the group and the user
        group = Group.query.get(group_id)
        user = User.query.get(user_id)

        # Ensure both group and user exist
        if not (group and user):
            return {"success": False, "message": "Group or user not found"}, 404

        # Ensure the user is an admin of the group
        if user.role != "admin" or user.group_id != group_id:
            return {"success": False, "message": "Only the group admin can delete the group"}, 403

        # Delete the group and all associated join requests
        db.session.delete(group)
        db.session.commit()

        return {"success": True, "message": "Group deleted successfully"}, 200

    except Exception as e:
        db.session.rollback()
        return {"success": False, "message": f"An error occurred: {str(e)}"}, 500
    
def leave_group(user_id):
    """Allows a group member to leave the group only if today is the 1st of the month."""
    try:
        # Check if today is the 1st of the month
        if datetime.utcnow().day != 1:
            return {"success": False, "message": "Leaving the group is only allowed on the 1st of the month"}, 403

        # Fetch the user
        user = User.query.get(user_id)

        # Ensure the user exists and is in a group
        if not user or not user.is_in_group():
            return {"success": False, "message": "User not found or not in a group"}, 404

        # Only allow non-admin users to leave; admins must delete the group instead
        if user.role == "admin":
            return {"success": False, "message": "Admins cannot leave the group directly. Please delete the group instead."}, 403

        # Remove user from the group
        user.group_id = None
        user.role = "member"  # Reset role to a default state outside any group
        db.session.commit()

        return {"success": True, "message": "Successfully left the group"}, 200

    except Exception as e:
        db.session.rollback()
        return {"success": False, "message": f"An error occurred: {str(e)}"}, 500
    
def fetch_user_join_requests(user_id):
    """Fetches all pending join requests received by the specified user."""
    try:
        # Retrieve the current user
        user = User.query.get(user_id)

        # Check if the user exists and handle the case
        if user is None:
            return {"success": False, "message": "User not found."}, 404

        # Fetch all pending join requests sent to this user
        pending_requests = GroupJoinRequest.query.filter_by(user_id=user_id, status="pending").all()

        # Convert join requests to dictionaries for easy JSON serialization
        requests_data = [request.to_dict() for request in pending_requests]

        return {"success": True, "join_requests": requests_data}, 200

    except SQLAlchemyError as e:
        db.session.rollback()  # Rollback in case of a database error
        return {"success": False, "message": "Database error occurred: " + str(e)}, 500
    except Exception as e:
        return {"success": False, "message": "An unexpected error occurred: " + str(e)}, 500
    
def get_group_members(group_id):
    """Fetch all members of a specific group."""
    try:
        # Fetch all users belonging to the group
        members = User.query.filter_by(group_id=group_id).all()

        # Convert to dictionary for easier use in JSON response
        members_data = [member.to_dict() for member in members]

        return {
            'success': True,
            'data': members_data
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}
    

def get_unread_notifications_for_user(user_id):
    """Fetches unread group join notifications for a specific user, showing only the new member's details."""
    try:
        # Retrieve the user from the database to ensure they exist
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Query for unread notifications related to group joins for the user
        unread_notifications = db.session.query(Notification).join(
            UserNotificationStatus,
            (UserNotificationStatus.notification_id == Notification.id) &
            (UserNotificationStatus.user_id == user_id) &
            (UserNotificationStatus.seen == False)
        ).filter(Notification.message.like('%joined the group%')).all()  # Only join group notifications

        # Prepare the notifications to be returned
        notifications_data = []
        for notif in unread_notifications:
            # **Extract the new member's name from the notification message**
            new_member_name = notif.message.split(' joined the group.')[0]
            
            # **Query the user by name (assumes unique names or adapt as necessary)**
            new_member = User.query.filter_by(name=new_member_name).first()
            if not new_member:
                continue  # Skip if the new member user is not found

            # Prepare notification data with the specific new member details
            notifications_data.append({
                'notification': {
                    'id': notif.id,
                    'message': notif.message,
                    'created_at': notif.created_at.isoformat(),
                    'group_id': notif.group_id
                },
                'new_member': {
                    'id': new_member.id,
                    'name': new_member.name,
                    'email': new_member.email,
                    'join_date': new_member.join_date.isoformat() if new_member.join_date else None
                }
            })

        return jsonify({
            "success": True,
            "notifications": notifications_data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error retrieving notifications: {str(e)}"
        }), 500
    



def mark_notifications_as_read(user_id, notification_ids):
    """Marks specific notifications as read for the user."""
    try:
        # Update the notifications as seen
        db.session.query(UserNotificationStatus).filter(
            UserNotificationStatus.user_id == user_id,
            UserNotificationStatus.notification_id.in_(notification_ids)
        ).update({'seen': True}, synchronize_session='fetch')
        
        db.session.commit()
        return {"success": True, "message": "Notifications marked as read"}

    except Exception as e:
        db.session.rollback()
        return {"success": False, "message": f"Error marking notifications as read: {str(e)}"}

def add_group_member(user_id, group_id):
    try:
        # Start a transaction by not committing yet
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        user.group_id = group_id  # Assign the user to the group
        db.session.add(user)

        # Create the notification
        message = f"{user.name} joined the group."
        new_notification = Notification(group_id=group_id, message=message)
        db.session.add(new_notification)

        # Mark this notification as unread for all group members
        group_members = User.query.filter_by(group_id=group_id).all()
        for member in group_members:
            user_status = UserNotificationStatus(user_id=member.id, notification_id=new_notification.id)
            db.session.add(user_status)

        # Now, commit all the changes at once
        db.session.commit()

    except (SQLAlchemyError, ValueError) as e:
        # In case of error, rollback the session and handle the exception
        db.session.rollback()
        return {"success": False, "message": f"Error adding user to group: {str(e)}"}
    except Exception as e:
        # Catch any other unexpected exceptions
        db.session.rollback()
        return {"success": False, "message": f"Unexpected error: {str(e)}"}

    return {"success": True, "message": "User added to group successfully"}