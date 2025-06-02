document.addEventListener('DOMContentLoaded', () => {
    // --- SUPABASE CLIENT SETUP ---
    // Replace with your actual Supabase URL and Anon Key
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- DOM Elements ---
    const pages = document.querySelectorAll('.page');
    const navItems = document.querySelectorAll('.nav-item');
    const pageTitleElement = document.getElementById('pageTitle');

    const loginPage = document.getElementById('loginPage');
    const otpPage = document.getElementById('otpPage');
    const profileDetailsPage = document.getElementById('profileDetailsPage');
    const ordersPage = document.getElementById('ordersPage');
    const addPage = document.getElementById('addPage');
    const profileViewPage = document.getElementById('profileViewPage');

    // Login Page
    const loginForm = document.getElementById('loginForm');
    const mobileNumberLoginInput = document.getElementById('mobileNumberLogin');
    const termsCheckbox = document.getElementById('termsConditions');
    const viewTermsLink = document.getElementById('viewTermsLink');
    const termsModal = document.getElementById('termsModal');
    const closeModalButton = document.querySelector('.modal .close-button');


    // OTP Page
    const otpForm = document.getElementById('otpForm');
    const otpInput = document.getElementById('otpInput');
    const otpMobileNumberDisplay = document.getElementById('otpMobileNumberDisplay');
    const resendOtpBtn = document.getElementById('resendOtpBtn');

    // Profile Details Page
    const profileDetailsForm = document.getElementById('profileDetailsForm');
    const shopNameInput = document.getElementById('shopName');
    const businessCategoryInput = document.getElementById('businessCategory');
    const profileMobileNumberInput = document.getElementById('profileMobileNumber');
    const streetInput = document.getElementById('street');
    const districtInput = document.getElementById('district');
    const stateInput = document.getElementById('state');
    const pincodeInput = document.getElementById('pincode');

    // Orders Page
    const orderNotificationsList = document.getElementById('orderNotificationsList');
    const noOrdersText = document.getElementById('noOrdersText');

    // Add Page (Menu Editor)
    const showAddItemFormBtn = document.getElementById('showAddItemFormBtn');
    const addItemForm = document.getElementById('addItemForm');
    const cancelAddItemBtn = document.getElementById('cancelAddItemBtn');
    const itemImageInput = document.getElementById('itemImage');
    const itemImagePreview = document.getElementById('itemImagePreview');
    const itemNameInput = document.getElementById('itemName');
    const itemPriceInput = document.getElementById('itemPrice');
    const itemDescriptionInput = document.getElementById('itemDescription');
    const editItemIdInput = document.getElementById('editItemId'); // Hidden input for item ID being edited
    const menuItemsList = document.getElementById('menuItemsList');
    const noMenuItemsText = document.getElementById('noMenuItemsText');


    // Profile View Page
    const viewShopName = document.getElementById('viewShopName');
    const viewBusinessCategory = document.getElementById('viewBusinessCategory');
    const viewMobileNumber = document.getElementById('viewMobileNumber');
    const viewStreet = document.getElementById('viewStreet');
    const viewDistrict = document.getElementById('viewDistrict');
    const viewState = document.getElementById('viewState');
    const viewPincode = document.getElementById('viewPincode');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    let currentUser = null;
    let userProfile = null;
    let menuItems = []; // Local cache for menu items
    let orders = []; // Local cache for orders

    // --- UTILITY FUNCTIONS ---
    function showPage(pageId, title) {
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        pageTitleElement.textContent = title || 'StreetRApp';

        // Update active nav item
        navItems.forEach(item => {
            item.classList.remove('active-nav');
            if (item.dataset.page === pageId) {
                item.classList.add('active-nav');
            }
        });
    }

    function saveToLocalStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getFromLocalStorage(key) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    }

    // --- INITIALIZATION & AUTH CHECK ---
    async functioninitializeApp() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error getting session:", error.message);
            showPage('loginPage', 'Login');
            return;
        }

        if (session && session.user) {
            currentUser = session.user;
            await loadUserProfile();
            if (userProfile && userProfile.shop_name) { // Assuming shop_name means profile is complete
                showPage('ordersPage', 'Orders');
                loadOrdersRealtime();
                loadMenuItems();
                populateProfileView(); // Ensure profile view page is populated
            } else if (currentUser) { // User logged in but profile not complete
                showPage('profileDetailsPage', 'Complete Your Profile');
                profileMobileNumberInput.value = currentUser.phone;
            } else { // No user, no profile
                showPage('loginPage', 'Login');
            }
        } else {
            showPage('loginPage', 'Login');
        }

        // Check for cached profile details if offline (more complex to fully implement)
        const cachedProfile = getFromLocalStorage('userProfile');
        if (cachedProfile && !userProfile) { // If no live profile but cached one exists
            userProfile = cachedProfile;
            // Decide if app should work offline or force login
        }
    }


    // --- AUTHENTICATION ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!termsCheckbox.checked) {
            alert("Please agree to the Terms & Conditions.");
            return;
        }
        const mobile = mobileNumberLoginInput.value;
        // Basic validation for Indian mobile numbers
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            alert("Please enter a valid 10-digit Indian mobile number.");
            return;
        }

        // Supabase OTP login
        const { error } = await supabase.auth.signInWithOtp({
            phone: `+91${mobile}` // Assuming Indian numbers, prefix +91
        });

        if (error) {
            console.error("OTP Error:", error);
            alert(`Error sending OTP: ${error.message}`);
        } else {
            otpMobileNumberDisplay.textContent = `+91${mobile}`;
            showPage('otpPage', 'Verify OTP');
        }
    });

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = otpInput.value;
        const phone = otpMobileNumberDisplay.textContent; // Already includes +91

        const { data: { session }, error } = await supabase.auth.verifyOtp({
            phone: phone,
            token: otp,
            type: 'sms' // or 'phone_change' if applicable
        });

        if (error) {
            console.error("OTP Verification Error:", error);
            alert(`Error verifying OTP: ${error.message}`);
        } else if (session && session.user) {
            currentUser = session.user;
            otpInput.value = ''; // Clear OTP input
            await loadUserProfile(); // Attempt to load profile
            if (userProfile && userProfile.shop_name) { // Profile exists
                showPage('ordersPage', 'Orders');
                loadOrdersRealtime();
                loadMenuItems();
            } else { // New user or incomplete profile
                showPage('profileDetailsPage', 'Complete Your Profile');
                profileMobileNumberInput.value = currentUser.phone.replace('+91', ''); // Display without country code
            }
        } else {
            alert("Could not verify OTP. Please try again.");
        }
    });

    resendOtpBtn.addEventListener('click', async () => {
        const mobile = mobileNumberLoginInput.value; // Get from original login input
         if (!/^[6-9]\d{9}$/.test(mobile)) {
            alert("Mobile number not available for resend. Please go back to login.");
            return;
        }
        const { error } = await supabase.auth.signInWithOtp({ phone: `+91${mobile}` });
        if (error) alert(`Error resending OTP: ${error.message}`);
        else alert("OTP Resent!");
    });

    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Logout error:", error);
            alert("Error logging out.");
        } else {
            currentUser = null;
            userProfile = null;
            localStorage.removeItem('userProfile');
            localStorage.removeItem('menuItems');
            // Clear all dynamic content
            orderNotificationsList.innerHTML = '';
            menuItemsList.innerHTML = '';
            qrCodeContainer.innerHTML = '';
            showPage('loginPage', 'Login');
            loginForm.reset();
            termsCheckbox.checked = false;
        }
    });

    // --- PROFILE MANAGEMENT ---
    async function loadUserProfile() {
        if (!currentUser) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for new users
            console.error("Error loading profile:", error);
            // alert("Could not load your profile.");
        } else if (data) {
            userProfile = data;
            saveToLocalStorage('userProfile', userProfile);
            populateProfileView(); // Populate view page if data is loaded
        } else {
            userProfile = null; // Ensure profile is null if not found
        }
    }

    profileDetailsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("You are not logged in!");
            return;
        }

        const profileData = {
            id: currentUser.id, // This should be the user's UUID from Supabase Auth
            shop_name: shopNameInput.value,
            business_category: businessCategoryInput.value,
            mobile_number: profileMobileNumberInput.value, // Already has +91 if from currentUser.phone
            street: streetInput.value,
            district: districtInput.value,
            state: stateInput.value,
            pincode: pincodeInput.value,
            updated_at: new Date()
        };

        // Upsert to save or update profile
        const { data, error } = await supabase
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error("Error saving profile:", error);
            alert(`Error saving profile: ${error.message}`);
        } else {
            userProfile = data;
            saveToLocalStorage('userProfile', userProfile);
            alert("Profile saved successfully!");
            populateProfileView(); // Update profile view
            showPage('ordersPage', 'Orders'); // Navigate to orders page
            loadOrdersRealtime();
            loadMenuItems();
        }
    });

    function populateProfileView() {
        if (!userProfile) {
            // console.warn("No user profile to display.");
            // Potentially clear fields or show a message
            return;
        }
        viewShopName.textContent = userProfile.shop_name || 'N/A';
        viewBusinessCategory.textContent = userProfile.business_category || 'N/A';
        viewMobileNumber.textContent = userProfile.mobile_number || currentUser?.phone || 'N/A';
        viewStreet.textContent = userProfile.street || 'N/A';
        viewDistrict.textContent = userProfile.district || 'N/A';
        viewState.textContent = userProfile.state || 'N/A';
        viewPincode.textContent = userProfile.pincode || 'N/A';

        // Generate QR Code (Seller's Menu Link - Placeholder)
        // This URL would be what the customer app uses to fetch this seller's menu
        // Example: https://customerapp.com/menu?seller_id=USER_ID
        qrCodeContainer.innerHTML = ''; // Clear previous QR
        if (currentUser && currentUser.id) {
             const sellerMenuUrl = `https://YOUR_CUSTOMER_APP_DOMAIN/menu?sellerId=${currentUser.id}`; // Replace with actual URL
             try {
                new QRCode(qrCodeContainer, {
                    text: sellerMenuUrl,
                    width: 180,
                    height: 180,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            } catch(e) {
                console.error("QR Code generation failed:", e);
                qrCodeContainer.textContent = "QR Code generation failed. Ensure qrcode.min.js is loaded.";
            }
        } else {
            qrCodeContainer.textContent = "Login to generate QR code.";
        }
    }

    editProfileBtn.addEventListener('click', () => {
        if (!userProfile) {
            alert("No profile data to edit. Please complete your profile first.");
            showPage('profileDetailsPage', 'Complete Your Profile');
            if(currentUser) profileMobileNumberInput.value = currentUser.phone.replace('+91','');
            return;
        }
        // Pre-fill the profile details form for editing
        shopNameInput.value = userProfile.shop_name || '';
        businessCategoryInput.value = userProfile.business_category || '';
        profileMobileNumberInput.value = userProfile.mobile_number || currentUser?.phone.replace('+91','') || '';
        streetInput.value = userProfile.street || '';
        districtInput.value = userProfile.district || '';
        stateInput.value = userProfile.state || '';
        pincodeInput.value = userProfile.pincode || '';
        showPage('profileDetailsPage', 'Edit Profile');
    });

    // --- MENU MANAGEMENT (ADD PAGE) ---
    showAddItemFormBtn.addEventListener('click', () => {
        addItemForm.style.display = 'block';
        showAddItemFormBtn.style.display = 'none';
        addItemForm.reset(); // Clear form for new item
        itemImagePreview.style.display = 'none';
        editItemIdInput.value = ''; // Ensure it's not in edit mode
        document.querySelector('#addItemForm h3').textContent = 'Add New Menu Item';
    });

    cancelAddItemBtn.addEventListener('click', () => {
        addItemForm.style.display = 'none';
        showAddItemFormBtn.style.display = 'block';
        addItemForm.reset();
        itemImagePreview.style.display = 'none';
    });

    itemImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                itemImagePreview.src = e.target.result;
                itemImagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            itemImagePreview.style.display = 'none';
        }
    });

    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Please login to manage menu.");
            return;
        }

        const itemName = itemNameInput.value;
        const itemPrice = parseFloat(itemPriceInput.value);
        const itemDescription = itemDescriptionInput.value;
        const imageFile = itemImageInput.files[0];
        const editingItemId = editItemIdInput.value;

        let imageUrl = editingItemId ? menuItems.find(item => item.id === editingItemId)?.image_url : null; // Keep old image if not changed

        // 1. Upload image to Supabase Storage (if a new image is selected or new item)
        if (imageFile) {
            const fileName = `menu_images/${currentUser.id}_${Date.now()}_${imageFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('menu-item-images') // Make sure this bucket exists and has correct policies
                .upload(fileName, imageFile, {
                    cacheControl: '3600',
                    upsert: false // True if you want to overwrite if same name (unlikely with timestamp)
                });

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                alert('Error uploading image: ' + uploadError.message);
                return;
            }
            // Get public URL. Ensure your bucket policies allow public reads or use signed URLs.
            const { data: { publicUrl } } = supabase.storage.from('menu-item-images').getPublicUrl(fileName);
            imageUrl = publicUrl;
        }


        const itemData = {
            user_id: currentUser.id,
            name: itemName,
            price: itemPrice,
            description: itemDescription,
            image_url: imageUrl,
        };

        let error, data;

        if (editingItemId) { // Editing existing item
            itemData.id = editingItemId; // Not needed directly in upsert if `id` is primary key and present
            itemData.updated_at = new Date();
             ({ data, error } = await supabase
                .from('menu_items')
                .update(itemData)
                .eq('id', editingItemId)
                .eq('user_id', currentUser.id) // Ensure user owns item
                .select()
                .single());
        } else { // Adding new item
            ({ data, error } = await supabase
                .from('menu_items')
                .insert(itemData)
                .select()
                .single());
        }


        if (error) {
            console.error('Error saving menu item:', error);
            alert('Error saving menu item: ' + error.message);
        } else {
            alert(`Menu item ${editingItemId ? 'updated' : 'saved'} successfully!`);
            addItemForm.reset();
            itemImagePreview.style.display = 'none';
            addItemForm.style.display = 'none';
            showAddItemFormBtn.style.display = 'block';
            editItemIdInput.value = ''; // Reset edit ID
            await loadMenuItems(); // Refresh the list
        }
    });

    async function loadMenuItems() {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error loading menu items:", error);
            alert("Could not load your menu.");
        } else {
            menuItems = data;
            saveToLocalStorage('menuItems', menuItems); // Cache
            renderMenuItems();
        }
    }

    function renderMenuItems() {
        menuItemsList.innerHTML = '<h3>Your Menu</h3>'; // Clear previous items
        if (!menuItems || menuItems.length === 0) {
            noMenuItemsText.style.display = 'block';
            return;
        }
        noMenuItemsText.style.display = 'none';

        menuItems.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'menu-item-card';
            itemCard.innerHTML = `
                <img src="${item.image_url || 'assets/app_icon.png'}" alt="${item.name}" onerror="this.onerror=null;this.src='assets/app_icon.png';">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>Price: ₹${item.price.toFixed(2)}</p>
                    ${item.description ? `<p class="desc">${item.description}</p>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-order-view" data-item-id="${item.id}">View Orders</button>
                    <button class="btn-edit-item" data-item-id="${item.id}">Edit</button>
                    <button class="btn-delete-item" data-item-id="${item.id}">Delete</button>
                </div>
            `;
            // Add event listeners for edit and delete
            itemCard.querySelector('.btn-edit-item').addEventListener('click', () => handleEditItem(item.id));
            itemCard.querySelector('.btn-delete-item').addEventListener('click', () => handleDeleteItem(item.id, item.name));
            itemCard.querySelector('.btn-order-view').addEventListener('click', () => alert(`Viewing orders for ${item.name} (Not Implemented)`));

            menuItemsList.appendChild(itemCard);
        });
    }

    function handleEditItem(itemId) {
        const itemToEdit = menuItems.find(item => item.id === itemId);
        if (!itemToEdit) return;

        addItemForm.style.display = 'block';
        showAddItemFormBtn.style.display = 'none';
        document.querySelector('#addItemForm h3').textContent = 'Edit Menu Item';


        editItemIdInput.value = itemToEdit.id;
        itemNameInput.value = itemToEdit.name;
        itemPriceInput.value = itemToEdit.price;
        itemDescriptionInput.value = itemToEdit.description || '';
        itemImageInput.value = ''; // Clear file input
        if (itemToEdit.image_url) {
            itemImagePreview.src = itemToEdit.image_url;
            itemImagePreview.style.display = 'block';
        } else {
            itemImagePreview.style.display = 'none';
        }
        addPage.scrollIntoView({ behavior: 'smooth' }); // Scroll to form
    }

    async function handleDeleteItem(itemId, itemName) {
        if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;

        // Optional: Delete image from storage if you want to clean up
        // const itemToDelete = menuItems.find(item => item.id === itemId);
        // if (itemToDelete && itemToDelete.image_url) {
        // try {
        //    const imagePath = itemToDelete.image_url.substring(itemToDelete.image_url.lastIndexOf('menu-item-images/') + 'menu-item-images/'.length);
        //    await supabase.storage.from('menu-item-images').remove([imagePath]);
        //  } catch (storageError) { console.warn("Could not delete image from storage:", storageError); }
        // }


        const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', itemId)
            .eq('user_id', currentUser.id); // Ensure user owns item

        if (error) {
            console.error('Error deleting item:', error);
            alert('Error deleting item: ' + error.message);
        } else {
            alert(`"${itemName}" deleted successfully.`);
            await loadMenuItems(); // Refresh list
        }
    }

    // --- ORDER MANAGEMENT (ORDERS PAGE) ---
    // This needs to be real-time
    let orderSubscription = null;

    function loadOrdersRealtime() {
        if (orderSubscription) { // Unsubscribe from previous if any
            supabase.removeChannel(orderSubscription);
        }
        if (!currentUser) return;

        // Initial fetch of existing orders (e.g., pending orders)
        fetchInitialOrders();

        // Realtime subscription for new orders
        orderSubscription = supabase.channel(`public:orders:seller_id=eq.${currentUser.id}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `seller_id=eq.${currentUser.id}` },
                (payload) => {
                    console.log('Order change received!', payload);
                    // You'll likely want to fetch the specific new/updated order or just reload all
                    // For simplicity, refetching all pending orders:
                    fetchInitialOrders(); // This could be optimized

                    // Push Notification (Conceptual)
                    if (payload.eventType === 'INSERT' && Notification.permission === "granted") {
                        new Notification("New Order Received!", {
                            body: `A new order has been placed for your shop.`,
                            icon: 'assets/app_icon.png'
                        });
                    } else if (Notification.permission !== "denied") {
                        Notification.requestPermission().then(permission => {
                            if (permission === "granted" && payload.eventType === 'INSERT') {
                               new Notification("New Order Received!", {
                                    body: `A new order has been placed for your shop.`,
                                    icon: 'assets/app_icon.png'
                                });
                            }
                        });
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Subscribed to orders channel!');
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('Order subscription error or timeout:', err);
                    // Optionally try to resubscribe after a delay
                }
            });
    }

    async function fetchInitialOrders() {
        if (!currentUser) return;
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items ( *, menu_items (name) ),
                profiles!customer_id ( shop_name, mobile_number ) 
            `) // Assuming 'profiles' table has customer details if customer is also a user or you have a customer details table.
               // Adjust the foreign key `profiles!customer_id` to `profiles!user_id` or whatever your customer reference is.
               // If customer is not a user, you might have 'customer_name', 'customer_phone' directly on 'orders' table.
            .eq('seller_id', currentUser.id)
            .in('status', ['pending', 'confirmed', 'late_delivery']) // Example: Fetch only active orders
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching orders:", error);
            noOrdersText.style.display = 'block';
        } else {
            orders = data;
            renderOrders();
        }
    }

    function renderOrders() {
        orderNotificationsList.innerHTML = '';
        if (!orders || orders.length === 0) {
            noOrdersText.style.display = 'block';
            return;
        }
        noOrdersText.style.display = 'none';

        orders.forEach(order => {
            const orderItemDiv = document.createElement('div');
            orderItemDiv.className = 'order-item';
            orderItemDiv.dataset.orderId = order.id;

            // Customer details might be nested or directly on the order
            let customerName = order.customer_name || order.profiles?.shop_name || 'Customer'; // Adjust based on your 'orders' table structure
            let itemSummary = order.order_items.map(oi => `${oi.menu_items.name} x${oi.quantity}`).join(', ');
            if (!itemSummary && order.items_summary) itemSummary = order.items_summary; // Fallback if items_summary is directly on order

            orderItemDiv.innerHTML = `
                <h4>Order #${order.id.substring(0, 8)} (From: ${customerName})</h4>
                <p>Items: ${itemSummary || 'Details not available'}</p>
                <p>Total: ₹${order.total_amount ? order.total_amount.toFixed(2) : 'N/A'}</p>
                <p>Status: <strong class="order-status-${order.status}">${order.status || 'Unknown'}</strong></p>
                <div class="order-actions">
                    ${order.status === 'pending' ? `
                        <button class="btn-action btn-reject" data-action="not_available">❌ Not Available</button>
                        <button class="btn-action btn-late" data-action="late_delivery">⏳ Late Delivery</button>
                        <button class="btn-action btn-confirm" data-action="confirmed">✅ Confirm Order</button>
                    ` : (order.status === 'confirmed' ? `<span style="color:green;">Order Confirmed</span>` :
                         order.status === 'late_delivery' ? `<span style="color:orange;">Marked as Late</span>` :
                         order.status === 'not_available' ? `<span style="color:red;">Marked as Not Available</span>` :
                         `<span style="color:grey;">Status: ${order.status}</span>`
                        )
                    }
                </div>
            `;
            orderNotificationsList.appendChild(orderItemDiv);
        });

        // Add event listeners to new action buttons
        document.querySelectorAll('.order-item .btn-action').forEach(button => {
            button.addEventListener('click', handleOrderAction);
        });
    }

    async function handleOrderAction(event) {
        const button = event.target;
        const orderId = button.closest('.order-item').dataset.orderId;
        const action = button.dataset.action; // 'not_available', 'late_delivery', 'confirmed'

        if (!orderId || !action) return;

        const { data, error } = await supabase
            .from('orders')
            .update({ status: action, updated_at: new Date() })
            .eq('id', orderId)
            .eq('seller_id', currentUser.id); // Security: ensure seller owns this order

        if (error) {
            console.error(`Error updating order to ${action}:`, error);
            alert(`Failed to update order: ${error.message}`);
        } else {
            alert(`Order marked as ${action.replace('_', ' ')}.`);
            // The real-time subscription should ideally pick this change up and re-render.
            // Or, you can manually update the UI here or call fetchInitialOrders().
            fetchInitialOrders(); // Re-fetch to update UI state immediately
        }
    }


    // --- NAVIGATION ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            let title = 'StreetRApp';
            if (pageId === 'ordersPage') title = 'My Orders';
            else if (pageId === 'addPage') title = 'Manage Menu';
            else if (pageId === 'profileViewPage') {
                title = 'My Profile';
                populateProfileView(); // Ensure profile data is fresh
            }
            showPage(pageId, title);
        });
    });

    // Terms Modal Logic
    viewTermsLink.addEventListener('click', (e) => {
        e.preventDefault();
        termsModal.style.display = 'block';
    });
    closeModalButton.addEventListener('click', () => {
        termsModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => { // Close if clicked outside
        if (event.target == termsModal) {
            termsModal.style.display = 'none';
        }
    });


    // --- START THE APP ---
    initializeApp();

    // Request Notification Permission on load (optional, can be done contextually)
    // if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    //     Notification.requestPermission().then(permission => {
    //         if (permission === "granted") {
    //             console.log("Notification permission granted.");
    //         }
    //     });
    // }

}); // End DOMContentLoaded
