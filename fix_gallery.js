const http = require('http');

const updateGallery = async () => {
    // 1. Fetch current content
    const getOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/content',
        method: 'GET'
    };

    const req = http.request(getOptions, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const content = JSON.parse(data);
            
            // 2. Update gallery
            content.gallery = [
                {
                    id: "g1",
                    image: "images/erp_crm_dashboard.png",
                    title: "ERP & CRM Dashboard",
                    description: "Sikandar's elegant, high-performance dark mode Enterprise Resource Planning and CRM interface."
                },
                {
                    id: "g2",
                    image: "images/product_dashboard.png",
                    title: "Product Analytics Suite",
                    description: "A modern, clean SaaS product dashboard designed for comprehensive sales and inventory tracking."
                },
                {
                    id: "g3",
                    image: "images/pos_system_ui.png",
                    title: "Cloud POS System",
                    description: "A beautiful, vibrant Point of Sale software interface tailored for quick and easy retail operations."
                },
                {
                    id: "g4",
                    image: "images/self_checkout_kiosk.png",
                    title: "Self-Checkout Kiosk",
                    description: "Our futuristic, vertical touchscreen self-checkout interface designed to eliminate retail queues."
                }
            ];

            // 3. Post updated content
            const postData = JSON.stringify(content);
            const postOptions = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/admin/content',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const postReq = http.request(postOptions, postRes => {
                let postResData = '';
                postRes.on('data', chunk => postResData += chunk);
                postRes.on('end', () => {
                    console.log('Successfully updated gallery content:', postResData);
                });
            });

            postReq.on('error', e => console.error(e));
            postReq.write(postData);
            postReq.end();
        });
    });

    req.on('error', e => console.error(e));
    req.end();
};

updateGallery();
