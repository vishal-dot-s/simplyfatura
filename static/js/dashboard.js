const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
document.addEventListener('DOMContentLoaded', function () {
    const invoiceDetails = document.getElementById('invoice-info');
    const invoiceLinks = document.querySelectorAll('.invoice-list a');
    invoiceLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const invoiceId = this.dataset.invoice;
        loadInvoiceDetails(invoiceId);
      });
    });
  
    function loadInvoiceDetails(invoiceId) {
      const invoiceData = {
        '01543': {
          client: 'Hexagon Digital',
          issueDate: '12/05/2023',
          amount: '$2,200.00',
          items: [
            { description: 'Network Cable', qty: 4, rate: '$30', total: '$1,200.00' },
            { description: 'Network Router', qty: 5, rate: '$20', total: '$1,000.00' }
          ]
        },
        '01544': {
          client: 'Rodriguez Consulting',
          issueDate: '15/05/2023',
          amount: '$1,250.00',
          items: [
            { description: 'Web Development', qty: 10, rate: '$100', total: '$1,000.00' },
            { description: 'SEO Services', qty: 1, rate: '$250', total: '$250.00' }
          ]
        }
      };
  
      const invoice = invoiceData[invoiceId];
      if (invoice) {
        let invoiceHtml = `
          <h2>Invoice: ${invoiceId}</h2>
          <p>Invoice Number: ${invoiceId}</p>
          <p>Issue Date: ${invoice.issueDate}</p>
          <p>Client: ${invoice.client}</p>
          <p>Amount: ${invoice.amount}</p>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
            </thead>
            <tbody>
        `;
        invoice.items.forEach(item => {
          invoiceHtml += `
            <tr>
              <td>${item.description}</td>
              <td>${item.qty}</td>
              <td>${item.rate}</td>
              <td>${item.total}</td>
            </tr>
          `;
        });
        invoiceHtml += '</tbody></table>';
        invoiceHtml += `<p>Sub Total: ${invoice.amount}</p><p>Balance Due: ${invoice.amount}</p>`;
        invoiceDetails.innerHTML = invoiceHtml;
      }
    }
  });
  



function fetchUnreadNotifications() {
  fetch('/api/notifications/unread')
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              if (data.notifications && data.notifications.length > 0) {
                console.log(data.notifications)
                  toggleModalOne(); // Show the modal
                  populateTable(data.notifications); // Populate the table with the notifications
              }
          }
      })
      .catch(error => console.error("Error fetching notifications:", error));
}



function toggleModalOne() {
  const modalOne = document.getElementById("modal-one");
  const modalOneContent = document.getElementById("content-one");
  
  // Toggle 'open' class to show or hide the modal
  if (modalOne.classList.contains("open")) {
      modalOne.classList.remove("open");
      modalOneContent.classList.remove("open");
  } else {
      modalOne.classList.add("open");
      modalOneContent.classList.add("open");
  }
}



function populateTable(notifications) {
  const tableBody = document.getElementById("members-table").querySelector("tbody");
  tableBody.innerHTML = ""; // Clear any existing rows

  notifications.forEach(notification => {
      const newMember = notification.new_member;  // Access the single new member object
      
      // Create a new table row and set a data attribute for the notification ID
      const row = document.createElement("tr");
      row.setAttribute("data-notification-id", notification.notification.id);

      // Add a checkbox for marking this notification as read
      const checkboxCell = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("mark-as-read-checkbox");
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);

      // Message cell (notification message)
      const messageCell = document.createElement("td");
      messageCell.textContent = notification.notification.message;
      row.appendChild(messageCell);

      // Name cell (new member's name)
      const nameCell = document.createElement("td");
      nameCell.textContent = newMember.name;
      row.appendChild(nameCell);

      // Email cell (new member's email)
      const emailCell = document.createElement("td");
      emailCell.textContent = newMember.email || "N/A"; // Display "N/A" if email is not available
      row.appendChild(emailCell);

      // Join Date cell (new member's join date)
      const joinDateCell = document.createElement("td");
      joinDateCell.textContent = newMember.join_date ? new Date(newMember.join_date).toLocaleDateString() : "N/A";
      row.appendChild(joinDateCell);

      // Append the row to the table body
      tableBody.appendChild(row);
  });
}



fetchUnreadNotifications()


function markNotificationsAsRead(notificationIds) {
  // Ensure that we are passing a valid array of notification IDs
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      console.error("No notification IDs provided to mark as read.");
      return;
  }

  fetch('/notifications/mark_as_read', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken  // Add CSRF token if needed for security
      },
      body: JSON.stringify({ notification_ids: notificationIds })
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          notificationIds.forEach(id => {
            const row = document.querySelector(`tr[data-notification-id="${id}"]`);
            if (row) {
                row.remove();
            }
        });
      } else {
          console.error("Error marking notifications as read:", data.message);
      }
  })
  .catch(error => console.error("Error:", error));
}


function markSelectedNotificationsAsRead() {
  // Gather all selected notification IDs
  const selectedNotificationIds = Array.from(document.querySelectorAll('.mark-as-read-checkbox:checked'))
      .map(checkbox => checkbox.closest("tr").getAttribute("data-notification-id"));

  if (selectedNotificationIds.length === 0) {
      alert("No notifications selected to mark as read.");
      return;
  }

  // Call the function to mark notifications as read
  markNotificationsAsRead(selectedNotificationIds);
}


const uploadmodal = document.getElementById("uploadModal");
const uploadInvoiceBtn = document.getElementById("uploadInvoiceBtn");
const uploadcloseBtn = document.getElementById("closeModal");

// Open modal when the button is clicked
uploadInvoiceBtn.addEventListener("click", () => {
  uploadmodal.classList.add("active");
});

// Close modal when the close button is clicked
uploadcloseBtn.addEventListener("click", () => {
  uploadmodal.classList.remove("active");
});

// // Optional: Close modal when clicking outside the modal content
// window.addEventListener("click", (event) => {
//   if (event.target === modal) {
//     uploadmodal.classList.remove("active");
//   }
// });



document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.querySelector(".sidebar");
  const hamburgerBtn = document.getElementById("hamburger-btn");

  hamburgerBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    document.querySelector(".content").classList.toggle("sidebar-open");
    hamburgerBtn.classList.toggle("active"); // Toggle the active class
  });
});




