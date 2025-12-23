import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Common
    appName: 'JAIPUR',
    tagline: 'A fine wood furniture company',
    version: 'Production Sheet System v1.0',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    search: 'Search',
    filter: 'Filter',
    actions: 'Actions',
    back: 'Back',
    view: 'View',
    preview: 'Preview',
    download: 'Download',
    upload: 'Upload',
    none: 'None',
    yes: 'Yes',
    no: 'No',
    
    // Navigation
    dashboard: 'Dashboard',
    orders: 'Orders',
    newOrder: 'New Order',
    products: 'Products',
    quotation: 'Quotation',
    factoryUnit: 'Factory / Unit',
    leatherLibrary: 'Leather Library',
    finishLibrary: 'Finish Library',
    templateSettings: 'Template Settings',
    
    // Products
    productsTitle: 'Products',
    productsDesc: 'Manage your product catalog',
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    addNewProduct: 'Add New Product',
    noProductsYet: 'No products added yet',
    addFirstProduct: 'Add First Product',
    searchProducts: 'Search by code or description...',
    allCategories: 'All Categories',
    productCode: 'Product Code *',
    productImage: 'Product Image',
    pricing: 'Pricing',
    warehousePrice: 'Warehouse Price',
    deleteProduct: 'Delete Product',
    deleteProductConfirm: 'Are you sure you want to delete product',
    productAdded: 'Product added successfully',
    productUpdated: 'Product updated successfully',
    productDeleted: 'Product deleted successfully',
    showing: 'Showing',
    of: 'of',
    productsLabel: 'products',
    product: 'Product',
    size: 'Size',
    noProductsFound: 'No products found',
    
    // Quotation
    quotationTitle: 'Quotation',
    quotationDesc: 'Create and manage price quotations',
    quotationDetails: 'Quotation Details',
    customerName: 'Customer Name',
    enterCustomerName: 'Enter customer name',
    reference: 'Reference',
    date: 'Date',
    currency: 'Currency',
    quotationItems: 'Quotation Items',
    noItemsInQuotation: 'No items in quotation',
    addProducts: 'Add Products',
    selectProducts: 'Select Products',
    productsSelected: 'products selected',
    addSelected: 'Add Selected',
    itemsAdded: 'Items added to quotation',
    generateQuote: 'Generate Quote',
    totalItems: 'Total Items',
    totalCBM: 'Total CBM',
    grandTotal: 'Grand Total',
    pcs: 'pcs',
    total: 'Total',
    containerEstimate: 'Container Load Estimate',
    containers: 'container(s)',
    
    // Factory Management
    factoryManagementTitle: 'Factory / Unit',
    factoryManagementDesc: 'Manage your factories and production units',
    addFactory: 'Add Factory',
    editFactory: 'Edit Factory',
    addNewFactory: 'Add New Factory',
    noFactoriesYet: 'No factories added yet',
    addFirstFactory: 'Add First Factory',
    factoryCode: 'Code *',
    factoryName: 'Name *',
    factoryCodeDesc: 'Short code (max 5 characters)',
    deleteFactory: 'Delete Factory',
    deleteFactoryConfirm: 'Are you sure you want to delete',
    factoryAdded: 'Factory added successfully',
    factoryUpdated: 'Factory updated successfully',
    factoryDeleted: 'Factory deleted successfully',
    failedToAddFactory: 'Failed to add factory',
    failedToUpdateFactory: 'Failed to update factory',
    failedToDeleteFactory: 'Failed to delete factory',
    
    // Dashboard
    dashboardTitle: 'Dashboard',
    dashboardDesc: 'Overview of your production sheets',
    totalOrders: 'Total Orders',
    drafts: 'Drafts',
    inProduction: 'In Production',
    completed: 'Completed',
    recentOrders: 'Recent Orders',
    viewAll: 'View All',
    noOrdersYet: 'No orders yet',
    createFirstOrder: 'Create Your First Order',
    items: 'items',
    
    // Orders
    ordersTitle: 'Orders',
    ordersDesc: 'Manage your production orders',
    searchPlaceholder: 'Search by reference, buyer...',
    allStatuses: 'All Statuses',
    noOrdersFound: 'No orders found',
    createNewOrder: 'Create New Order',
    salesOrderRef: 'Sales Order Ref',
    buyerPO: 'Buyer PO',
    buyer: 'Buyer',
    entryDate: 'Entry Date',
    status: 'Status',
    factory: 'Factory',
    
    // Status
    statusDraft: 'Draft',
    statusSubmitted: 'Submitted',
    statusInProduction: 'In Production',
    statusDone: 'Done',
    
    // Create Order
    createOrderTitle: 'Create New Order',
    createOrderDesc: 'Enter the order details to get started',
    orderInfo: 'Order Information',
    salesOrderRefLabel: 'Sales Order Reference *',
    buyerPORefLabel: 'Buyer PO Reference',
    buyerNameLabel: 'Buyer Name / Brand',
    entryDateLabel: 'Entry Date',
    factoryLabel: 'Factory / Unit',
    selectFactory: 'Select factory',
    selectStatus: 'Select status',
    createOrderBtn: 'Create Order & Add Items',
    creating: 'Creating...',
    backToOrders: 'Back to Orders',
    
    // Edit Order
    editOrderTitle: 'Edit Order',
    saveOrder: 'Save Order',
    saving: 'Saving...',
    lineItems: 'Line Items',
    addItem: 'Add Item',
    noItemsAdded: 'No items added yet',
    addFirstItem: 'Add First Item',
    backToOrder: 'Back to Order',
    
    // Item Editor
    addNewItem: 'Add New Item',
    editItem: 'Edit Item',
    productCode: 'Product Code *',
    category: 'Category',
    selectCategory: 'Select category',
    quantity: 'Quantity',
    description: 'Description',
    dimensions: 'Dimensions',
    heightCm: 'Height (cm)',
    depthCm: 'Depth (cm)',
    widthCm: 'Width (cm)',
    cbm: 'CBM',
    auto: 'auto',
    manual: 'manual',
    
    // Materials
    materialsFinish: 'Materials & Finish',
    leatherFabric: 'Leather / Fabric',
    selectFromLibrary: 'Select from library',
    uploadSwatchImage: 'Upload swatch image',
    finishCoating: 'Finish / Coating',
    colorNotes: 'Color Notes',
    woodFinish: 'Wood Finish',
    
    // Production
    productionDetails: 'Production Details',
    inHouseProduction: 'In-house Production',
    machineHall: 'Machine Hall / Workshop',
    
    // Notes & Images
    notes: 'Notes',
    notesPlaceholder: 'Enter notes (use • for bullet points)',
    notesTip: 'Tip: Use • for bullet points, **text** for bold',
    productImages: 'Product Images',
    clickToUpload: 'Click to upload images or drag and drop',
    
    // Order Detail
    orderDetailTitle: 'Order Details',
    pdf: 'PDF',
    ppt: 'PPT',
    whatsapp: 'WhatsApp',
    orderNotFound: 'Order not found',
    noItems: 'No items in this order',
    addItems: 'Add Items',
    
    // Preview
    productionSheet: 'Production Sheet',
    page: 'Page',
    of: 'of',
    noItemsToPreview: 'No items to preview',
    downloadPdf: 'Download PDF',
    downloadPpt: 'Download PPT',
    informedToFactory: 'INFORMED TO FACTORY',
    tdReceived: 'TD RECEIVED',
    sampleReadyDate: 'SAMPLE READY DATE',
    asap: 'ASAP',
    noImageAvailable: 'No Image Available',
    noMaterialSwatches: 'No material swatches',
    itemCode: 'ITEM CODE',
    sizeCm: 'SIZE (cm)',
    qty: 'Qty',
    
    // Libraries
    leatherLibraryTitle: 'Leather Library',
    leatherLibraryDesc: 'Manage your leather codes and materials',
    addLeather: 'Add Leather',
    noLeatherItems: 'No leather items yet',
    addFirstLeather: 'Add First Leather',
    editLeather: 'Edit Leather',
    addNewLeather: 'Add New Leather',
    code: 'Code *',
    name: 'Name *',
    color: 'Color',
    image: 'Image',
    
    finishLibraryTitle: 'Finish Library',
    finishLibraryDesc: 'Manage your finish codes and materials',
    addFinish: 'Add Finish',
    noFinishItems: 'No finish items yet',
    addFirstFinish: 'Add First Finish',
    editFinish: 'Edit Finish',
    addNewFinish: 'Add New Finish',
    
    // Template Settings
    templateSettingsTitle: 'Template Settings',
    templateSettingsDesc: 'Customize your PDF and PPT export templates',
    resetToDefault: 'Reset to Default',
    saveSettings: 'Save Settings',
    branding: 'Branding',
    logoText: 'Logo Text',
    logoTextDesc: 'This text appears as the logo in exports',
    companyName: 'Company Name',
    companyNameDesc: 'Appears below the logo',
    primaryColor: 'Primary Color',
    primaryColorDesc: 'Used for headers, titles, and table headers',
    accentColor: 'Accent Color',
    accentColorDesc: 'Used for highlights and accents',
    typography: 'Typography',
    headingFont: 'Heading Font',
    headingFontDesc: 'CSS font-family for headings',
    bodyFont: 'Body Font',
    bodyFontDesc: 'CSS font-family for body text',
    pageLayout: 'Page Layout',
    pageMargin: 'Page Margin (mm)',
    headerHeight: 'Header Height (mm)',
    footerHeight: 'Footer Height (mm)',
    showTableBorders: 'Show Table Borders',
    showTableBordersDesc: 'Display borders around table cells in exports',
    previewSection: 'Preview',
    
    // Delete confirmations
    deleteOrder: 'Delete Order',
    deleteOrderConfirm: 'Are you sure you want to delete order',
    deleteLeatherItem: 'Delete Leather Item',
    deleteFinishItem: 'Delete Finish Item',
    deleteConfirm: 'Are you sure you want to delete',
    cannotUndo: 'This action cannot be undone.',
    
    // Toast messages
    orderCreated: 'Order created successfully',
    orderSaved: 'Order saved successfully',
    orderDeleted: 'Order deleted successfully',
    itemAdded: 'Item added',
    itemUpdated: 'Item updated',
    itemRemoved: 'Item removed',
    settingsSaved: 'Settings saved successfully',
    settingsReset: 'Settings reset to defaults (not saved)',
    pdfDownloadStarted: 'PDF download started',
    pptDownloadStarted: 'PPT download started',
    openingWhatsApp: 'Opening WhatsApp...',
    failedToLoad: 'Failed to load',
    failedToSave: 'Failed to save',
    failedToDelete: 'Failed to delete',
    failedToShare: 'Failed to share',
    codeNameRequired: 'Code and Name are required',
    productCodeRequired: 'Product code is required',
    salesRefRequired: 'Sales Order Reference is required',
    
    // Language
    language: 'Language',
    english: 'English',
    hindi: 'हिंदी',
  },
  
  hi: {
    // Common
    appName: 'जयपुर',
    tagline: 'एक उत्कृष्ट लकड़ी फर्नीचर कंपनी',
    version: 'प्रोडक्शन शीट सिस्टम v1.0',
    loading: 'लोड हो रहा है...',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    add: 'जोड़ें',
    create: 'बनाएं',
    update: 'अपडेट करें',
    search: 'खोजें',
    filter: 'फ़िल्टर',
    actions: 'कार्रवाई',
    back: 'वापस',
    view: 'देखें',
    preview: 'पूर्वावलोकन',
    download: 'डाउनलोड',
    upload: 'अपलोड',
    none: 'कोई नहीं',
    yes: 'हाँ',
    no: 'नहीं',
    
    // Navigation
    dashboard: 'डैशबोर्ड',
    orders: 'ऑर्डर',
    newOrder: 'नया ऑर्डर',
    products: 'प्रोडक्ट्स',
    factoryUnit: 'फैक्ट्री / यूनिट',
    leatherLibrary: 'लेदर लाइब्रेरी',
    finishLibrary: 'फिनिश लाइब्रेरी',
    templateSettings: 'टेम्पलेट सेटिंग्स',
    
    // Products
    productsTitle: 'प्रोडक्ट्स',
    productsDesc: 'अपना प्रोडक्ट कैटलॉग प्रबंधित करें',
    addProduct: 'प्रोडक्ट जोड़ें',
    editProduct: 'प्रोडक्ट संपादित करें',
    addNewProduct: 'नया प्रोडक्ट जोड़ें',
    noProductsYet: 'अभी कोई प्रोडक्ट नहीं जोड़ा गया',
    addFirstProduct: 'पहला प्रोडक्ट जोड़ें',
    searchProducts: 'कोड या विवरण से खोजें...',
    allCategories: 'सभी श्रेणियाँ',
    productCode: 'प्रोडक्ट कोड *',
    productImage: 'प्रोडक्ट इमेज',
    pricing: 'मूल्य निर्धारण',
    warehousePrice: 'वेयरहाउस मूल्य',
    deleteProduct: 'प्रोडक्ट हटाएं',
    deleteProductConfirm: 'क्या आप वाकई इस प्रोडक्ट को हटाना चाहते हैं',
    productAdded: 'प्रोडक्ट सफलतापूर्वक जोड़ा गया',
    productUpdated: 'प्रोडक्ट सफलतापूर्वक अपडेट किया गया',
    productDeleted: 'प्रोडक्ट सफलतापूर्वक हटाया गया',
    showing: 'दिखा रहा है',
    of: 'में से',
    productsLabel: 'प्रोडक्ट्स',
    product: 'प्रोडक्ट',
    size: 'साइज',
    
    // Factory Management
    factoryManagementTitle: 'फैक्ट्री / यूनिट',
    factoryManagementDesc: 'अपनी फैक्ट्रियों और प्रोडक्शन यूनिट प्रबंधित करें',
    addFactory: 'फैक्ट्री जोड़ें',
    editFactory: 'फैक्ट्री संपादित करें',
    addNewFactory: 'नई फैक्ट्री जोड़ें',
    noFactoriesYet: 'अभी कोई फैक्ट्री नहीं जोड़ी गई',
    addFirstFactory: 'पहली फैक्ट्री जोड़ें',
    factoryCode: 'कोड *',
    factoryName: 'नाम *',
    factoryCodeDesc: 'शॉर्ट कोड (अधिकतम 5 अक्षर)',
    deleteFactory: 'फैक्ट्री हटाएं',
    deleteFactoryConfirm: 'क्या आप वाकई हटाना चाहते हैं',
    factoryAdded: 'फैक्ट्री सफलतापूर्वक जोड़ी गई',
    factoryUpdated: 'फैक्ट्री सफलतापूर्वक अपडेट की गई',
    factoryDeleted: 'फैक्ट्री सफलतापूर्वक हटाई गई',
    failedToAddFactory: 'फैक्ट्री जोड़ने में विफल',
    failedToUpdateFactory: 'फैक्ट्री अपडेट करने में विफल',
    failedToDeleteFactory: 'फैक्ट्री हटाने में विफल',
    
    // Dashboard
    dashboardTitle: 'डैशबोर्ड',
    dashboardDesc: 'आपकी प्रोडक्शन शीट्स का अवलोकन',
    totalOrders: 'कुल ऑर्डर',
    drafts: 'ड्राफ्ट',
    inProduction: 'प्रोडक्शन में',
    completed: 'पूर्ण',
    recentOrders: 'हाल के ऑर्डर',
    viewAll: 'सभी देखें',
    noOrdersYet: 'अभी कोई ऑर्डर नहीं',
    createFirstOrder: 'अपना पहला ऑर्डर बनाएं',
    items: 'आइटम',
    
    // Orders
    ordersTitle: 'ऑर्डर',
    ordersDesc: 'अपने प्रोडक्शन ऑर्डर प्रबंधित करें',
    searchPlaceholder: 'रेफरेंस, खरीदार द्वारा खोजें...',
    allStatuses: 'सभी स्थिति',
    noOrdersFound: 'कोई ऑर्डर नहीं मिला',
    createNewOrder: 'नया ऑर्डर बनाएं',
    salesOrderRef: 'सेल्स ऑर्डर रेफ',
    buyerPO: 'खरीदार PO',
    buyer: 'खरीदार',
    entryDate: 'प्रवेश तिथि',
    status: 'स्थिति',
    factory: 'फैक्ट्री',
    
    // Status
    statusDraft: 'ड्राफ्ट',
    statusSubmitted: 'जमा किया गया',
    statusInProduction: 'प्रोडक्शन में',
    statusDone: 'पूर्ण',
    
    // Create Order
    createOrderTitle: 'नया ऑर्डर बनाएं',
    createOrderDesc: 'शुरू करने के लिए ऑर्डर विवरण दर्ज करें',
    orderInfo: 'ऑर्डर जानकारी',
    salesOrderRefLabel: 'सेल्स ऑर्डर रेफरेंस *',
    buyerPORefLabel: 'खरीदार PO रेफरेंस',
    buyerNameLabel: 'खरीदार का नाम / ब्रांड',
    entryDateLabel: 'प्रवेश तिथि',
    factoryLabel: 'फैक्ट्री / यूनिट',
    selectFactory: 'फैक्ट्री चुनें',
    selectStatus: 'स्थिति चुनें',
    createOrderBtn: 'ऑर्डर बनाएं और आइटम जोड़ें',
    creating: 'बना रहा है...',
    backToOrders: 'ऑर्डर पर वापस जाएं',
    
    // Edit Order
    editOrderTitle: 'ऑर्डर संपादित करें',
    saveOrder: 'ऑर्डर सहेजें',
    saving: 'सहेज रहा है...',
    lineItems: 'लाइन आइटम',
    addItem: 'आइटम जोड़ें',
    noItemsAdded: 'अभी कोई आइटम नहीं जोड़ा गया',
    addFirstItem: 'पहला आइटम जोड़ें',
    backToOrder: 'ऑर्डर पर वापस जाएं',
    
    // Item Editor
    addNewItem: 'नया आइटम जोड़ें',
    editItem: 'आइटम संपादित करें',
    productCode: 'प्रोडक्ट कोड *',
    category: 'श्रेणी',
    selectCategory: 'श्रेणी चुनें',
    quantity: 'मात्रा',
    description: 'विवरण',
    dimensions: 'आयाम',
    heightCm: 'ऊंचाई (सेमी)',
    depthCm: 'गहराई (सेमी)',
    widthCm: 'चौड़ाई (सेमी)',
    cbm: 'CBM',
    auto: 'स्वचालित',
    manual: 'मैनुअल',
    
    // Materials
    materialsFinish: 'सामग्री और फिनिश',
    leatherFabric: 'लेदर / फैब्रिक',
    selectFromLibrary: 'लाइब्रेरी से चुनें',
    uploadSwatchImage: 'स्वैच इमेज अपलोड करें',
    finishCoating: 'फिनिश / कोटिंग',
    colorNotes: 'रंग नोट्स',
    woodFinish: 'लकड़ी फिनिश',
    
    // Production
    productionDetails: 'प्रोडक्शन विवरण',
    inHouseProduction: 'इन-हाउस प्रोडक्शन',
    machineHall: 'मशीन हॉल / वर्कशॉप',
    
    // Notes & Images
    notes: 'नोट्स',
    notesPlaceholder: 'नोट्स दर्ज करें (• बुलेट पॉइंट के लिए उपयोग करें)',
    notesTip: 'टिप: बुलेट पॉइंट के लिए • उपयोग करें',
    productImages: 'प्रोडक्ट इमेज',
    clickToUpload: 'अपलोड करने के लिए क्लिक करें या ड्रैग और ड्रॉप करें',
    
    // Order Detail
    orderDetailTitle: 'ऑर्डर विवरण',
    pdf: 'PDF',
    ppt: 'PPT',
    whatsapp: 'व्हाट्सएप',
    orderNotFound: 'ऑर्डर नहीं मिला',
    noItems: 'इस ऑर्डर में कोई आइटम नहीं',
    addItems: 'आइटम जोड़ें',
    
    // Preview
    productionSheet: 'प्रोडक्शन शीट',
    page: 'पृष्ठ',
    of: 'का',
    noItemsToPreview: 'पूर्वावलोकन के लिए कोई आइटम नहीं',
    downloadPdf: 'PDF डाउनलोड करें',
    downloadPpt: 'PPT डाउनलोड करें',
    informedToFactory: 'फैक्ट्री को सूचित',
    tdReceived: 'TD प्राप्त',
    sampleReadyDate: 'सैंपल रेडी तिथि',
    asap: 'जल्द से जल्द',
    noImageAvailable: 'कोई इमेज उपलब्ध नहीं',
    noMaterialSwatches: 'कोई मटेरियल स्वैच नहीं',
    itemCode: 'आइटम कोड',
    sizeCm: 'साइज (सेमी)',
    qty: 'मात्रा',
    
    // Libraries
    leatherLibraryTitle: 'लेदर लाइब्रेरी',
    leatherLibraryDesc: 'अपने लेदर कोड और सामग्री प्रबंधित करें',
    addLeather: 'लेदर जोड़ें',
    noLeatherItems: 'अभी कोई लेदर आइटम नहीं',
    addFirstLeather: 'पहला लेदर जोड़ें',
    editLeather: 'लेदर संपादित करें',
    addNewLeather: 'नया लेदर जोड़ें',
    code: 'कोड *',
    name: 'नाम *',
    color: 'रंग',
    image: 'इमेज',
    
    finishLibraryTitle: 'फिनिश लाइब्रेरी',
    finishLibraryDesc: 'अपने फिनिश कोड और सामग्री प्रबंधित करें',
    addFinish: 'फिनिश जोड़ें',
    noFinishItems: 'अभी कोई फिनिश आइटम नहीं',
    addFirstFinish: 'पहला फिनिश जोड़ें',
    editFinish: 'फिनिश संपादित करें',
    addNewFinish: 'नया फिनिश जोड़ें',
    
    // Template Settings
    templateSettingsTitle: 'टेम्पलेट सेटिंग्स',
    templateSettingsDesc: 'अपने PDF और PPT एक्सपोर्ट टेम्पलेट कस्टमाइज़ करें',
    resetToDefault: 'डिफ़ॉल्ट पर रीसेट करें',
    saveSettings: 'सेटिंग्स सहेजें',
    branding: 'ब्रांडिंग',
    logoText: 'लोगो टेक्स्ट',
    logoTextDesc: 'यह टेक्स्ट एक्सपोर्ट में लोगो के रूप में दिखाई देता है',
    companyName: 'कंपनी का नाम',
    companyNameDesc: 'लोगो के नीचे दिखाई देता है',
    primaryColor: 'प्राथमिक रंग',
    primaryColorDesc: 'हेडर, शीर्षक और टेबल हेडर के लिए उपयोग किया जाता है',
    accentColor: 'एक्सेंट रंग',
    accentColorDesc: 'हाइलाइट्स और एक्सेंट के लिए उपयोग किया जाता है',
    typography: 'टाइपोग्राफी',
    headingFont: 'हेडिंग फॉन्ट',
    headingFontDesc: 'हेडिंग के लिए CSS font-family',
    bodyFont: 'बॉडी फॉन्ट',
    bodyFontDesc: 'बॉडी टेक्स्ट के लिए CSS font-family',
    pageLayout: 'पेज लेआउट',
    pageMargin: 'पेज मार्जिन (मिमी)',
    headerHeight: 'हेडर ऊंचाई (मिमी)',
    footerHeight: 'फुटर ऊंचाई (मिमी)',
    showTableBorders: 'टेबल बॉर्डर दिखाएं',
    showTableBordersDesc: 'एक्सपोर्ट में टेबल सेल के चारों ओर बॉर्डर दिखाएं',
    previewSection: 'पूर्वावलोकन',
    
    // Delete confirmations
    deleteOrder: 'ऑर्डर हटाएं',
    deleteOrderConfirm: 'क्या आप वाकई ऑर्डर हटाना चाहते हैं',
    deleteLeatherItem: 'लेदर आइटम हटाएं',
    deleteFinishItem: 'फिनिश आइटम हटाएं',
    deleteConfirm: 'क्या आप वाकई हटाना चाहते हैं',
    cannotUndo: 'यह कार्रवाई पूर्ववत नहीं की जा सकती।',
    
    // Toast messages
    orderCreated: 'ऑर्डर सफलतापूर्वक बनाया गया',
    orderSaved: 'ऑर्डर सफलतापूर्वक सहेजा गया',
    orderDeleted: 'ऑर्डर सफलतापूर्वक हटाया गया',
    itemAdded: 'आइटम जोड़ा गया',
    itemUpdated: 'आइटम अपडेट किया गया',
    itemRemoved: 'आइटम हटाया गया',
    settingsSaved: 'सेटिंग्स सफलतापूर्वक सहेजी गईं',
    settingsReset: 'सेटिंग्स डिफ़ॉल्ट पर रीसेट (सहेजी नहीं गईं)',
    pdfDownloadStarted: 'PDF डाउनलोड शुरू हुआ',
    pptDownloadStarted: 'PPT डाउनलोड शुरू हुआ',
    openingWhatsApp: 'व्हाट्सएप खोल रहा है...',
    failedToLoad: 'लोड करने में विफल',
    failedToSave: 'सहेजने में विफल',
    failedToDelete: 'हटाने में विफल',
    failedToShare: 'शेयर करने में विफल',
    codeNameRequired: 'कोड और नाम आवश्यक हैं',
    productCodeRequired: 'प्रोडक्ट कोड आवश्यक है',
    salesRefRequired: 'सेल्स ऑर्डर रेफरेंस आवश्यक है',
    
    // Language
    language: 'भाषा',
    english: 'English',
    hindi: 'हिंदी',
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('jaipur-language');
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('jaipur-language', language);
  }, [language]);

  const t = (key) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
