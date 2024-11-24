const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search_user');
const resultsContainer = document.getElementById('results-container');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
const user_id  = document.getElementById('user_id').value;
const group_id = document.getElementById('user_group_id');
let currentPage = 1;
const perPage = 10;

// Event listener for the search button
searchButton.addEventListener('click', () => {
    currentPage = 1; // Reset to the first page
    searchUsers(searchInput.value, currentPage, perPage);
});

async function searchUsers(query, page, perPage) {
    try {
        const response = await fetch('/group/searchUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ query, page, per_page: perPage })
        });
        usercloseModal()
        const result = await response.json();
        if (response.ok && result.success) {
             // Check if data is empty
             if (result.data.length === 0) {
                showModal(result.message,false); // Show the message that no users were found
            } else {
                displayResults(result.data); // Show the user results
                // updatePagination(result.page, result.pages, result.total);
            }
        } else {
          
        }
    } catch (error) {
        console.error('Fetch error:', error);
        displayError('An error occurred while searching for users.');
    }
}

const createGroupButton = document.getElementById('create-group-btn');

if (createGroupButton) {
    createGroupButton.addEventListener('click', function() {
       alert("hello world")
    });
}
document.getElementById('createGroupForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the default form submission
    const name = document.getElementById('name').value;
    try {
        // Send the fetch request to create a new group
        const response = await fetch('/group/create', {
            method: 'POST', // Use POST to create a new resource
            headers: {
                'Content-Type': 'application/json', // Indicate that we're sending JSON
                'X-CSRF-Token': csrfToken, // Include the CSRF token for security
            },
            credentials: 'same-origin', // Include credentials for same-origin requests
            body: JSON.stringify({ name }) // Convert the data to JSON format
        });

        // Handle the response from the server
        const result = await response.json();
        if (response.ok) {
           if(result.success)
            showModal(result.message,true)
        } else {
            showModal(result.error,false)
        }
    } catch (error) {
        console.error('Fetch error:', error); // Log any network errors
        alert('An error occurred while creating the group.'); // Notify user of the error
    }
});




function displayResults(users) {
    const modal = document.getElementById('membersModal');
    const groupsContainer = document.getElementById('finduserResult');
    groupsContainer.innerHTML = ''; // Clear previous results

    users.forEach(user => {
        // Create a new row for each user
        const userRow = document.createElement('div');
        userRow.classList.add('table-row');

        // Name column
        const nameColumn = document.createElement('div');
        nameColumn.classList.add('column-name');
        nameColumn.textContent = user.name;
        userRow.appendChild(nameColumn);

        // Email column
        const emailColumn = document.createElement('div');
        emailColumn.classList.add('column-email');
        emailColumn.textContent = user.email;
        userRow.appendChild(emailColumn);

        // Actions column (e.g., view profile, send message)
        const actionsColumn = document.createElement('div');
        actionsColumn.classList.add('column-actions');
        const viewProfileButton = document.createElement('button');
        viewProfileButton.textContent = 'View Profile';
        viewProfileButton.onclick = () => viewProfile(user.id,document.getElementById('user_group_id').textContent); // Define this function separately if needed
        actionsColumn.appendChild(viewProfileButton);
        userRow.appendChild(actionsColumn);

        // Join column (join group if available)
        const joinColumn = document.createElement('div');
        joinColumn.classList.add('column-join');
        if (!user.group_id) {  // If user isn't in a group, show a join button
            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join Group';
            joinButton.onclick = () => sendJoinRequest(user.id,document.getElementById('user_group_id').textContent); // Define this function separately if needed
            joinColumn.appendChild(joinButton);
        } else {
            joinColumn.textContent = 'Already in Group';
        }
        userRow.appendChild(joinColumn);

        // Append the row to the container
        groupsContainer.appendChild(userRow);
    });
    modal.style.display='block'
}



function fetch_get_join_request() {
    fetch(`/api/user/${user_id}/join-requests`)
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById("joinRequestsTableBody");
            tableBody.innerHTML = ""; // Clear any existing rows

            if (data.success) {
                console.log("Join Requests:", data.join_requests);
                
                // Check if there are any join requests
                if (data.join_requests.length === 0) {
                    // Create a new row indicating no join requests
                    const noRequestsRow = document.createElement("tr");
                    const noRequestsCell = document.createElement("td");
                    noRequestsCell.colSpan = 5; // Span across all columns
                    noRequestsCell.textContent = "No join requests pending.";
                    noRequestsCell.className = "no-join-requests"; // Optional: Add a class for styling
                    
                    noRequestsRow.appendChild(noRequestsCell);
                    tableBody.appendChild(noRequestsRow);
                } else {
                    // If there are join requests, iterate and create rows for them
                    data.join_requests.forEach(request => {
                        const row = document.createElement("tr");
                        row.classList.add('showjoinrequest_td');
                        
                        // Create cells for each piece of data
                        const userCell = document.createElement("td");
                        userCell.textContent = request.user;

                        const groupCell = document.createElement("td");
                        groupCell.textContent = request.group;

                        const joinDateCell = document.createElement("td");
                        joinDateCell.textContent = request.join_at;

                        const statusCell = document.createElement("td");
                        statusCell.textContent = request.status;

                        const actionsCell = document.createElement("td");

                        // Create "Accept" and "Reject" buttons
                        const acceptButton = document.createElement("button");
                        acceptButton.textContent = "Accept";
                        acceptButton.className = "accept-btn";
                        acceptButton.addEventListener("click", () => handleAccept(request.id));

                        const rejectButton = document.createElement("button");
                        rejectButton.textContent = "Reject";
                        rejectButton.className = "reject-btn";
                        rejectButton.addEventListener("click", () => handleReject(user_id, request.id));

                        // Append buttons to the actions cell
                        actionsCell.appendChild(acceptButton);
                        actionsCell.appendChild(rejectButton);

                        // Append cells to the row
                        row.appendChild(userCell);
                        row.appendChild(groupCell);
                        row.appendChild(joinDateCell);
                        row.appendChild(statusCell);
                        row.appendChild(actionsCell);

                        // Append the row to the table body
                        tableBody.appendChild(row);
                    });
                }
            } else {
                console.error("Error:", data.message);
                // Optionally, handle the error by showing a message
                const errorRow = document.createElement("tr");
                const errorCell = document.createElement("td");
                errorCell.colSpan = 5; // Span across all columns
                errorCell.textContent = data.message || "An error occurred while fetching join requests.";
                errorRow.appendChild(errorCell);
                tableBody.appendChild(errorRow);
            }
        })
        .catch(error => console.error("Fetch error:", error));
}
// Example accept and reject handler functions




async function handleReject(userId, requestId) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    try {
        const response = await fetch('/group/rejectJoinRequest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken // Include CSRF token for security
            },
            body: JSON.stringify({ user_id: userId, request_id: requestId })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(result.message); // Notify user of success
            fetch_get_request(userId);  // Refresh the join requests table
        } else {
            alert(result.message || 'Error occurred while rejecting the request');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('An error occurred while rejecting the request.');
    }
}



function fetchGroupMembers() {
   let gpi_id=  null;
   if (group_id) {
    gpi_id = group_id.textContent; // Get the text content if the element exists
}
    fetch(`/api/group/${gpi_id}/members`)
        .then(response => response.json())
        .then(data => {
            const groupsContainer = document.getElementById("groupsContainer");
            groupsContainer.innerHTML = ""; // Clear existing rows

            if (data.success) {
                data.data.forEach(member => {
                    console.log(member)
                    // Create a new row for each member
                    const row = document.createElement("div");
                    row.className = "table-row"; // You can add styles for rows

                    // Create cells for each piece of data
                    const nameCell = document.createElement("div");
                    nameCell.className = "column-name";
                    nameCell.textContent = member.name;

                    const emailCell = document.createElement("div");
                    emailCell.className = "column-email";
                    emailCell.textContent = member.email;

                    const actionsCell = document.createElement("div");
                    actionsCell.className = "column-actions";

                

                    const editButton = document.createElement("button");
                    editButton.textContent = "Edit";
                    editButton.className = "edit-btn";
                    editButton.style.width="50%"
                    editButton.addEventListener("click", () => handleEdit(member.id));
                    actionsCell.appendChild(editButton);

                    const rolecell = document.createElement("div");
                    rolecell.className = "column-email";
                    rolecell.textContent = member.role;

                    if(member.role==='admin'){
                    rolecell.style.textTransform = "uppercase";  // Makes text uppercase
                    rolecell.style.letterSpacing = "1px";
                    rolecell.style.border="2px solid green";
                    rolecell.style.width="10%"
                    rolecell.style.borderRadius="10px";
                    }else{
                        rolecell.style.textTransform = "uppercase";  // Makes text uppercase
                        rolecell.style.letterSpacing = "1px";  
                    }

                    const joinCell = document.createElement("div");
                    joinCell.className = "column-join";
                    joinCell.textContent = member.join_date ? new Date(member.join_date).toLocaleDateString() : "N/A";

                    // Append cells to the row
                    row.appendChild(nameCell);
                    row.appendChild(emailCell);
                    row.appendChild(actionsCell);
                    row.appendChild(rolecell);
                    row.appendChild(joinCell);
                

                    // Append the row to the groupsContainer
                    groupsContainer.appendChild(row);
                });
            } else {
                // Handle case when no members are found
                const noMembersMessage = document.createElement("div");
                noMembersMessage.textContent = "No members found for this group.";
                groupsContainer.appendChild(noMembersMessage);
            }
        })
        .catch(error => {
            console.error("Fetch error:", error);
            const errorMessage = document.createElement("div");
            errorMessage.textContent = "An error occurred while fetching group members.";
            groupsContainer.appendChild(errorMessage);
        });
}

// Call this function after the user logs in or when the manage group page is loaded
// Replace 'groupId' with the actual group ID
fetchGroupMembers(); // Update with the actual group ID




function handleAccept(requestId) {
    // Example user ID; update to retrieve dynamically as needed
    const userId = user_id;  // Replace with actual user_id if dynamic

    fetch('/api/join-request/accept', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ user_id: userId, request_id: requestId }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Join request accepted successfully!");
            // Optionally refresh the data or update the UI here
            fetch_get_join_request(userId);  // Refresh the join requests table
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => console.error("Fetch error:", error));
}

function handleReject(requestId) {
    console.log(`Rejecting request with ID: ${requestId}`);
    // Add functionality to reject the request here
}





async function sendJoinRequest(targetUserId,groupId) {
    // Set up the request body
    const requestBody = {
        admin_id: user_id,
        target_user_id: targetUserId,
        group_id: groupId
    };

    try {
        // Send the POST request to the backend
        const response = await fetch('/send_join_request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken, 
            },
            body: JSON.stringify(requestBody)
        });

        // Parse the JSON response
        const result = await response.json();

        // Check the status of the response
        if (response.ok) {
            console.log("Join request sent successfully:", result.message);
            showModal(result.message,true);
        } else {
            console.error("Failed to send join request:", result.message);
            showModal(result.message,false);
        }

    } catch (error) {
        console.error("An error occurred:", error);
    }
}



function openModal() {
    document.getElementById('groupModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('groupModal').style.display = 'none';
}

function usercloseModal(){
    document.getElementById('finduserModal').style.display = 'none';
}

function findusercloseModal(){
    document.getElementById('membersModal').style.display = 'none';
}


function openfinduserModal(){
    document.getElementById('finduserModal').style.display = 'flex';
}


const closeModalBtn = document.getElementById("closeModalBtn");

document.addEventListener("DOMContentLoaded", () => {
    const openModalBtn = document.getElementById("openJoinRequestsPopup");
    const joinRequestModal = document.getElementById("joinRequestModal");


    fetchGroupMembers()
    if (openModalBtn && joinRequestModal) {
        openModalBtn.addEventListener("click", () => {
            fetch_get_join_request()
            joinRequestModal.style.display = "flex";
        });
    }
});


// Close modal
closeModalBtn.addEventListener("click", () => {
    joinRequestModal.style.display = "none";
});

// Close modal when clicking outside content area
window.addEventListener("click", (e) => {
    if (e.target == joinRequestModal) {
        joinRequestModal.style.display = "none";
    }
});




document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.querySelector(".sidebar");
    const hamburgerBtn = document.getElementById("hamburger-btn");
  
    hamburgerBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      document.querySelector(".content").classList.toggle("sidebar-open");
      hamburgerBtn.classList.toggle("active"); // Toggle the active class
    });
  });
  