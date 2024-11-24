const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileProgress = document.getElementById('fileProgress');
const progressBar = document.getElementById('progress');
const progressStatus = document.getElementById('progressStatus');
const fileName = document.getElementById('fileName');
const browseBtn = document.getElementById('browseBtn');
const fileTypeIcon = document.getElementById('fileTypeIcon');
const result = document.getElementById('result');
 const modal = document.getElementById('cropModal');
        const closeModal = document.querySelector('.cropModelclose');
        const imageContainer = document.getElementById('image-container');
        const image = document.getElementById('image');
        const croppedImage = document.getElementById('croppedImage');
        const preview = document.getElementById('preview');
        const rotateSlider = document.getElementById('rotate-slider');
        let cropper;
        let uploadfile;
        let OCRDATA;
        let personalItems = [];
        let newUserAddedItems = [];
        fileInput.addEventListener('change', (event) => {
                uploadfile = event.target.files[0];
                    const reader = new FileReader();
        
                    reader.onload = function (e) {
                        image.src = e.target.result;
                        imageContainer.style.display = 'block';
                        preview.style.display = 'none';
                        rotateSlider.value = 0;
                        modal.style.display = 'block';
                    };
        
                    if (uploadfile) {
                         reader.readAsDataURL(uploadfile)
                        
                        }
        
            if (uploadfile) {
                fileProgress.style.display = 'block'; // Show the progress section
                fileName.innerText = uploadfile.name; // Display the file name
        
                // Set the appropriate file icon based on file type
                const fileExtension = uploadfile.name.split('.').pop().toLowerCase();
                if (fileExtension === 'pdf') {
                    fileTypeIcon.src = 'pdf-icon.png'; // Change to appropriate icon for PDF
                } else if (['jpg', 'jpeg', 'png', 'tif'].includes(fileExtension)) {
                    fileTypeIcon.src = 'image-icon.png'; // Change to appropriate icon for image
                } else if (fileExtension === 'mp4') {
                    fileTypeIcon.src = 'video-icon.png'; // Change to appropriate icon for video
                } else {
                    fileTypeIcon.src = 'file-icon.png'; // Default file icon
                }
        
                // Start the upload process
                // uploadFile(file);
            }
        });

        image.onload = function () {
          if (cropper) {
              cropper.destroy(); // Destroy the existing cropper instance
          }
      
          const targetWidth = 800; // Fixed crop frame width
          const targetHeight = 2500; // Fixed crop frame height
          const minAspectRatio = targetWidth / targetHeight; // Minimum aspect ratio
      
          cropper = new Cropper(image, {
              aspectRatio: 0, // Allow free cropping (no fixed aspect ratio)
              minAspectRatio: minAspectRatio, // Minimum aspect ratio to guide user cropping
              viewMode: 1, // Ensures the image is contained in the canvas
              zoomable: true, // Allow zooming
              movable: true, // Allow moving the crop box
              scalable: true, // Allow resizing the crop box freely
              ready() {
                  // Ensure the crop box is centered and fits the fixed dimensions
                  const canvasData = cropper.getCanvasData();
      
                  // Center the crop box and set the desired dimensions
                  cropper.setCropBoxData({
                      left: canvasData.left + (canvasData.width - targetWidth) / 2,
                      top: canvasData.top + (canvasData.height - targetHeight) / 2,
                      width: targetWidth,
                      height: targetHeight,
                  });
              },
              crop(event) {
                  // Dynamically generate the cropped result
                  const canvas = cropper.getCroppedCanvas({
                      width: targetWidth,
                      height: targetHeight,
                  });
                  croppedImage.src = canvas.toDataURL(); // Set the result to a preview or process it further
              },
          });
      };
      

        closeModal.onclick = function () {
            modal.style.display = "none";
        }

        window.onclick = function (event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        }

        document.getElementById('cropButton').addEventListener('click', function () {
            const canvas = cropper.getCroppedCanvas();
            croppedImage.src = canvas.toDataURL();
            // preview.style.display = 'block';
            modal.style.display = "none";
            canvas.toBlob(function(blob) {
                // Create a File object from the Blob
                const file = new File([blob], uploadfile.name, { type: 'image/jpeg' });
                uploadFile(file)
            }, 'image/jpeg', 1.0); 
           
        });

        document.getElementById('zoomInButton').addEventListener('click', function () {
            cropper.zoom(0.1);
        });

        document.getElementById('zoomOutButton').addEventListener('click', function () {
            cropper.zoom(-0.1);
        });

        document.getElementById('panUpButton').addEventListener('click', function () {
            cropper.move(0, -10);
        });

        document.getElementById('panDownButton').addEventListener('click', function () {
            cropper.move(0, 10);
        });

        document.getElementById('panLeftButton').addEventListener('click', function () {
            cropper.move(-10, 0);
        });

        document.getElementById('panRightButton').addEventListener('click', function () {
            cropper.move(10, 0);
        });

        rotateSlider.addEventListener('input', function () {
            const rotationValue = parseInt(rotateSlider.value, 10);
            cropper.rotate(rotationValue - cropper.getData().rotate);
        });

// Rotate slider event
rotateSlider.addEventListener('input', function () {
    if (cropper) {
        const rotationValue = parseInt(rotateSlider.value, 10);
        cropper.rotate(rotationValue - cropper.getData().rotate);
    }
});

// Event listener for clicking the browse button
browseBtn.addEventListener('click', () => {
    fileInput.click(); // Trigger file input click
});

// Event listener for file selection


// Function to upload file
function uploadFile(file) {
    const xhr = new XMLHttpRequest();
    const url = '/uploads'; // Change this to your Flask endpoint

    // Reset progress bar
    progressBar.style.width = '0%';
    progressStatus.style.display = 'none';

    // Update progress bar during upload
    xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            progressBar.style.width = percentComplete + '%'; // Update progress bar width

            if (percentComplete === 100) {
                progressStatus.style.display = 'inline-block'; // Show checkmark when complete
            }
        }
    });

    // Handle the response after upload is complete
    xhr.onload = () => {
        const response = xhr.response;
        if (xhr.status === 200) {
                progressStatus.style.display = 'inline-block';
                result.style.color = "green";
                result.innerText = response.message;

                if (response.error) {
                    alert(response.error);
                } else {
                    const uploadmodal = document.getElementById("uploadModal");
                    uploadmodal.style.display="none"
                    OCRDATA = response.data;
                    console.log(response.data)
                    const total = response.data.Total;
                    if(total==='Not Found'){
                      showModal("Total Not Found Rescan Your Invoice", false)
                      return
                    }

                    toggleInvoiceModal()
                    displayInvoiceData(OCRDATA)
                    resetUpload()
                }

        }else {
            console.error("File upload failed with status: " + xhr.status);
            console.error("Response body:", response);  
            alert("File upload failed. Status: " + xhr.status + ". Please try again.");
        }
    };

    // Handle network error scenarios
    xhr.onerror = () => {
        console.error('A network error occurred while uploading the file.');
        alert('A network error occurred. Please check your connection and try again.'); // Display an error alert
    };

    // Handle upload errors
    xhr.upload.onerror = () => {
        console.error('An error occurred during the upload process.');
        alert('An error occurred during the upload. Please try again.'); // Display an error alert
    };

    // Send the file using FormData
    const formData = new FormData();
    // const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    // formData.append('csrf_token', csrfToken);
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    formData.append('file', file); 
    xhr.open('POST', url, true);
    xhr.setRequestHeader('X-CSRFToken', csrfToken); //
    xhr.responseType="json"
    xhr.send(formData); // Send the FormData
}

// Function to reset the upload area after successful upload
function resetUpload() {
    fileProgress.style.display = 'none'; // Hide progress section
    fileInput.value = ''; // Clear file input
    progressBar.style.width = '0%'; // Reset progress bar
    progressStatus.style.display = 'none'; // Hide checkmark
    fileName.innerText = ''; // Clear file name
    fileTypeIcon.src = 'file-icon.png'; // Reset file icon
} 



function toggleInvoiceModal() {
    const invoiceModal = document.getElementById("invoice-one");
    const invoiceModalContent = document.getElementById("invoice-content-one");
    
    // Toggle 'open' class to show or hide the invoice modal
    if (invoiceModal.classList.contains("open")) {
        invoiceModal.classList.remove("open");
        invoiceModalContent.classList.remove("open");
    } else {
        invoiceModal.classList.add("open");
        invoiceModalContent.classList.add("open");
    }
  }


  function openAddItemModal() {
    document.getElementById("addItemModal").style.display = "block";
}

// Function to close the modal
function closeAddItemModal() {
    document.getElementById("addItemModal").style.display = "none";
}


// Function to display invoice data and add listeners to checkboxes
function displayInvoiceData(invoiceData) {
  // Display invoice number and date
  document.getElementById("invoice-number").innerText = invoiceData.InvoiceNumber || "N/A";
  document.getElementById("invoice-date").innerText = invoiceData.Date || "N/A";
  document.getElementById("invoice-time").innerText = invoiceData.Time || "N/A";

  // Get the table body
  const tableBody = document.querySelector("#invoice_item-table tbody");
  tableBody.innerHTML = ""; // Clear existing rows

  // Initialize total to 0
   let calculatedTotal = 0;
  // Populate items
    invoiceData.Items.forEach((item, index) => {
    const row = document.createElement("tr");

    // Item Name
    const nameCell = document.createElement("td");
    nameCell.textContent = item.Description;
    row.appendChild(nameCell);

    // Quantity
    const quantityCell = document.createElement("td");
    quantityCell.textContent = item.Quantity;
    row.appendChild(quantityCell);

    // Price
    const priceCell = document.createElement("td");
  const priceInput = document.createElement("input");
  priceInput.type = "number";
  priceInput.value = item.Price.toFixed(2);
  priceInput.classList.add("price-input");
  priceCell.appendChild(priceInput);
  row.appendChild(priceCell);

  // Add event listener to handle price changes
  priceInput.addEventListener("change", function() {
    const oldPrice = item.price; // Use the item's price from the data
    const newPrice = parseFloat(priceInput.value);

    // Ensure the new price is valid
    if (isNaN(newPrice)) {
      alert("Invalid price entered.");
      return;
    }

    // If the price changes, update the total by subtracting the old price and adding the new price
    updateTotal(newPrice - oldPrice);
    item.price = newPrice; // Update the item's price in the data
  });

    const TaxCell = document.createElement("td");
    TaxCell.textContent = item.Tax;
    row.appendChild(TaxCell);

    // Mark as Personal (Checkbox)
    const personalCell = document.createElement("td");
    const personalCheckbox = document.createElement("input");
    personalCheckbox.type = "checkbox";
    personalCheckbox.classList.add("personal-checkbox");

    // ** Add event listener to handle personal item marking and update the total **
    personalCheckbox.addEventListener("change", function() {
      if (personalCheckbox.checked) {
        // Mark as personal: Subtract price from total
        if (!personalItems.includes(index)) {
          personalItems.push(index);
        }
      } else {
        // Unmark as personal: Add price back to total
        const itemIndex = personalItems.indexOf(index);
        if (itemIndex > -1) {
          personalItems.splice(itemIndex, 1);
        }
      }
      console.log(personalItems)
    });

    personalCell.appendChild(personalCheckbox);
    row.appendChild(personalCell);
    
    tableBody.appendChild(row);
    calculatedTotal += item.Price
  });

  // Display total amount
  document.getElementById("invoice-total-amount").innerText = calculatedTotal.toFixed(2);
}





function addNewItem() {
  const name = document.getElementById("new-item-name").value;
  const quantity = parseFloat(document.getElementById("new-item-quantity").value);
  const price = parseFloat(document.getElementById("new-item-price").value);
  const tax = document.getElementById("new-item-tax").value;
  // Validate input fields
  if (!name || isNaN(quantity) || isNaN(price)) {
    alert("Please fill out all fields with valid data.");
    return;
  }

  // Create a new row for the table
  const tableBody = document.querySelector("#invoice_item-table tbody");
  const row = document.createElement("tr");

  // Item Name
  const nameCell = document.createElement("td");
  nameCell.textContent = name;
  row.appendChild(nameCell);

  // Quantity
  const quantityCell = document.createElement("td");
  quantityCell.textContent = quantity;
  row.appendChild(quantityCell);

  // Price
   const priceCell = document.createElement("td");
  const priceInput = document.createElement("input");
  priceInput.type = "number";
  priceInput.value = price.toFixed(2);
  priceInput.classList.add("price-input");
  priceCell.appendChild(priceInput);
  row.appendChild(priceCell);

  // Add event listener to handle price changes
  // priceInput.addEventListener("change", function() {
  //   const oldPrice = item.price; // Use the item's price from the data
  //   const newPrice = parseFloat(priceInput.value);

  //   // Ensure the new price is valid
  //   if (isNaN(newPrice)) {
  //     alert("Invalid price entered.");
  //     return;
  //   }

  //   // If the price changes, update the total by subtracting the old price and adding the new price
  //   updateTotal(newPrice - oldPrice);
  //   item.price = newPrice; // Update the item's price in the data
  // });

  const TaxCell = document.createElement("td");
  TaxCell.textContent = tax;
  row.appendChild(TaxCell);

  // Mark as Personal (Checkbox)
  const personalCell = document.createElement("td");
  const personalCheckbox = document.createElement("input");
  personalCheckbox.type = "checkbox";
  personalCheckbox.classList.add("personal-checkbox");

  // ** Add event listener to handle personal item marking and update the total **
  const itemIndex = tableBody.rows.length; // Get the current index
  personalCheckbox.addEventListener("change", function() {
    if (personalCheckbox.checked) {
      // Mark as personal: Subtract price from total
      if (!personalItems.includes(itemIndex)) {
        personalItems.push(itemIndex);
      }
    } else {
      // Unmark as personal: Add price back to total
      const index = personalItems.indexOf(itemIndex);
      if (index > -1) {
        personalItems.splice(index, 1);
      }
    }
    console.log(personalItems)
  });

  personalCell.appendChild(personalCheckbox);
  row.appendChild(personalCell);

  tableBody.appendChild(row);

  // Update the total
  updateTotal(price);
   // Add the new item to the array of new items
   const newItem = {
    Description: name,
    Quantity: quantity,
    Price: price
  };
  newUserAddedItems.push(newItem);

  // Clear the input fields and close the modal
  document.getElementById("new-item-name").value = "";
  document.getElementById("new-item-quantity").value = "";
  document.getElementById("new-item-price").value = "";
  closeAddItemModal();
}



function updateTotal() {
  const rows = document.querySelectorAll("#invoice_item-table tbody tr");
  let total = 0;

  rows.forEach(row => {
    const priceText = row.cells[2].textContent.replace("€", "");
    const price = parseFloat(priceText);
    total += price;
  });

  document.getElementById("invoice-total-amount").innerText = total.toFixed(2);
}


function updateTotal(amountChange) {
  const currentTotal = parseFloat(document.getElementById("invoice-total-amount").innerText) || 0;
  const newTotal = currentTotal + amountChange;
  document.getElementById("invoice-total-amount").innerText = newTotal.toFixed(2);
}


function submitInvoice() {
  if (!newUserAddedItems && !OCRDATA) {
    alert('Please process the invoice first.');
    return;
  }

  const ocrItems = Array.isArray(OCRDATA.Items) ? OCRDATA.Items : [];
  const newItems = Array.isArray(newUserAddedItems) ? newUserAddedItems : [];

// Combine the arrays
  const combinedItems = [...ocrItems, ...newItems];
  const calculatedTotal = combinedItems.reduce((acc, item) => acc + item.Price, 0);
  console.log(calculatedTotal)
  // Check if the calculated total matches the OCR total from the backend
  if (calculatedTotal.toFixed(2) !== OCRDATA.Total.toFixed(2)) {
    alert("Invoice total does not match the original detected amount. Please review the items.");
    return;  // Stop submission if totals do not match
  }

  // Prepare data to send
  const payload = {
    ocr_data : OCRDATA,
    user_items:newUserAddedItems,
    ps:personalItems // Send the list of personal item indices
  };

  // Send data to the backend using fetch API
  fetch('/submit-invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken  // Add CSRF token if needed for security
    },
    body: JSON.stringify(payload),  // Convert payload to JSON
  })
  .then(response => {
    if (!response.ok) {
        return response.json().then(errorData => {
            // Throw the server-provided error message or a generic one
            throw new Error(errorData.message || 'Failed to submit invoice');
        });
    }
    return response.json();
})
.then(data => {
    alert('Invoice submitted successfully!');
    // Handle success (e.g., clear the modal or navigate to another page)
})
.catch(error => {
    console.error('Error submitting invoice:', error);
    alert(`There was an error submitting the invoice: ${error.message}. Please try again.`);
});
}