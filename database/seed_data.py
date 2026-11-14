"""
Pre-configured delivery location scenarios for instant testing and demonstration.
All locations are set in Tamil Nadu, India (Chennai Metro, Coimbatore Corridor, and Madurai Express).
Each scenario includes 1 Warehouse (Depot) and realistic delivery points with customer details.
"""

SAMPLE_SCENARIOS = {
    "chennai": {
        "title": "Chennai Metro Logistics Express",
        "description": "Koyambedu wholesale distribution depot routing parcels across T. Nagar, Anna Nagar, OMR, Guindy, and Adyar.",
        "warehouse": {
            "name": "Chennai Central Distribution Hub - Koyambedu",
            "customer_name": "RouteGen Tamil Nadu Logistics HQ",
            "customer_phone": "+91 44 2479 0100",
            "customer_address": "Koyambedu Wholesale Market Complex, Chennai, Tamil Nadu 600107",
            "latitude": 13.0694,
            "longitude": 80.1948,
            "is_warehouse": 1,
            "priority": "High",
            "notes": "Main regional depot with multi-bay loading docks and cold-storage facility"
        },
        "deliveries": [
            {
                "name": "Drop #1 - T. Nagar Commercial Hub",
                "customer_name": "Pothys Traditional Wear & Silks",
                "customer_phone": "+91 44 2431 0120",
                "customer_address": "Usman Road, T. Nagar, Chennai, TN 600017",
                "latitude": 13.0418,
                "longitude": 80.2341,
                "is_warehouse": 0,
                "priority": "High",
                "notes": "Deliver before 11:00 AM, commercial delivery gate on South Usman Rd"
            },
            {
                "name": "Drop #2 - Anna Nagar West Retail",
                "customer_name": "VR Chennai Mall Logistics Bay",
                "customer_phone": "+91 44 2621 0188",
                "customer_address": "Jawaharlal Nehru Road, Anna Nagar West, Chennai, TN 600040",
                "latitude": 13.0850,
                "longitude": 80.2101,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Basement loading bay B2, entry from Inner Ring Road"
            },
            {
                "name": "Drop #3 - Nungambakkam Corporate Center",
                "customer_name": "Apex IT Towers & Business Park",
                "customer_phone": "+91 44 2827 0210",
                "customer_address": "Khader Nawaz Khan Rd, Nungambakkam, Chennai, TN 600034",
                "latitude": 13.0604,
                "longitude": 80.2437,
                "is_warehouse": 0,
                "priority": "Urgent",
                "notes": "Time-sensitive hardware server modules for enterprise data center"
            },
            {
                "name": "Drop #4 - George Town Wholesale Market",
                "customer_name": "Parry's Hardware & Spices Wholesale",
                "customer_phone": "+91 44 2534 0310",
                "customer_address": "NSC Bose Road, George Town, Chennai, TN 600001",
                "latitude": 13.0906,
                "longitude": 80.2885,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Heavy parcel cartons, unload at warehouse lane #4"
            },
            {
                "name": "Drop #5 - Mylapore Heritage Corner",
                "customer_name": "Kapaleeshwarar Artisan Crafts",
                "customer_phone": "+91 44 2498 0255",
                "customer_address": "Kutchery Road, Mylapore, Chennai, TN 600004",
                "latitude": 13.0336,
                "longitude": 80.2677,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Fragile handicraft goods, handle with care"
            },
            {
                "name": "Drop #6 - Guindy Industrial Estate",
                "customer_name": "Olympia Tech Park Logistics Desk",
                "customer_phone": "+91 44 2235 0415",
                "customer_address": "SIDCO Industrial Estate, Guindy, Chennai, TN 600032",
                "latitude": 13.0102,
                "longitude": 80.2120,
                "is_warehouse": 0,
                "priority": "High",
                "notes": "Electronic chip consignments for semiconductor assembly"
            },
            {
                "name": "Drop #7 - Adyar River View Plaza",
                "customer_name": "Green Valley Organics Co-op",
                "customer_phone": "+91 44 2441 0380",
                "customer_address": "Sardar Patel Road, Adyar, Chennai, TN 600020",
                "latitude": 13.0064,
                "longitude": 80.2575,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Perishable dairy and cold-pressed oil delivery"
            },
            {
                "name": "Drop #8 - Velachery Commercial Mall",
                "customer_name": "Phoenix Marketcity Courier Hub",
                "customer_phone": "+91 44 2244 0490",
                "customer_address": "Velachery Main Road, Chennai, TN 600042",
                "latitude": 12.9815,
                "longitude": 80.2180,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Retail fashion apparel cartons"
            },
            {
                "name": "Drop #9 - OMR Tidel Park Corridor",
                "customer_name": "Tidel Software Systems Ltd",
                "customer_phone": "+91 44 2254 0530",
                "customer_address": "Rajiv Gandhi Salai (OMR), Taramani, Chennai, TN 600113",
                "latitude": 12.9897,
                "longitude": 80.2473,
                "is_warehouse": 0,
                "priority": "Urgent",
                "notes": "Confidential biometric server equipment"
            },
            {
                "name": "Drop #10 - Thoraipakkam IT Expressway",
                "customer_name": "CloudSphere Technologies",
                "customer_phone": "+91 44 2496 0610",
                "customer_address": "200 Feet Radial Rd, Thoraipakkam, Chennai, TN 600097",
                "latitude": 12.9416,
                "longitude": 80.2362,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Office automation and ergonomics supplies"
            },
            {
                "name": "Drop #11 - Porur Medical & Tech Hub",
                "customer_name": "Sri Ramachandra Healthcare Supply",
                "customer_phone": "+91 44 2476 0720",
                "customer_address": "Mount Poonamallee Rd, Porur, Chennai, TN 600116",
                "latitude": 13.0382,
                "longitude": 80.1565,
                "is_warehouse": 0,
                "priority": "Urgent",
                "notes": "Temperature-monitored medical diagnostics kits"
            },
            {
                "name": "Drop #12 - Ambattur Industrial Estate",
                "customer_name": "Murugappa Group Ancillary Works",
                "customer_phone": "+91 44 2625 0840",
                "customer_address": "Ambattur Industrial Estate, Chennai, TN 600058",
                "latitude": 13.1075,
                "longitude": 80.1648,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Precision engineering spare parts"
            }
        ]
    },
    "coimbatore": {
        "title": "Coimbatore Industrial Corridor",
        "description": "Logistics depot routing through textile, manufacturing, and IT tech corridors of Coimbatore.",
        "warehouse": {
            "name": "Peelamedu Central Logistics Hub",
            "customer_name": "RouteGen Kovai Dispatch",
            "customer_phone": "+91 422 257 0101",
            "customer_address": "Avinashi Road, Peelamedu, Coimbatore, TN 641004",
            "latitude": 11.0267,
            "longitude": 77.0028,
            "is_warehouse": 1,
            "priority": "High",
            "notes": "Primary regional terminal near Coimbatore Airport"
        },
        "deliveries": [
            {
                "name": "Drop #1 - RS Puram Commercial Center",
                "customer_name": "Kovai Silk House",
                "customer_phone": "+91 422 254 0120",
                "customer_address": "DB Road, RS Puram, Coimbatore, TN 641002",
                "latitude": 11.0089,
                "longitude": 76.9507,
                "is_warehouse": 0,
                "priority": "High",
                "notes": "Handloom consignments"
            },
            {
                "name": "Drop #2 - Gandhipuram Retail Market",
                "customer_name": "Cross-Cut Trade Emporium",
                "customer_phone": "+91 422 249 0155",
                "customer_address": "Cross Cut Road, Gandhipuram, Coimbatore, TN 641012",
                "latitude": 11.0183,
                "longitude": 76.9644,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Consumer electronic devices"
            },
            {
                "name": "Drop #3 - Saibaba Colony Healthcare",
                "customer_name": "Kongu Medico Distributors",
                "customer_phone": "+91 422 244 0204",
                "customer_address": "NSR Road, Saibaba Colony, Coimbatore, TN 641011",
                "latitude": 11.0284,
                "longitude": 76.9427,
                "is_warehouse": 0,
                "priority": "Urgent",
                "notes": "Sterile pharmaceutical stock"
            },
            {
                "name": "Drop #4 - Ganapathy Industrial Spares",
                "customer_name": "Sharp Motor & Pump Ancillary",
                "customer_phone": "+91 422 253 0290",
                "customer_address": "Sathy Road, Ganapathy, Coimbatore, TN 641006",
                "latitude": 11.0410,
                "longitude": 76.9806,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Submersible pump casting boxes"
            },
            {
                "name": "Drop #5 - Singanallur Machinery Depot",
                "customer_name": "Premier Loom Equipment",
                "customer_phone": "+91 422 259 0341",
                "customer_address": "Trichy Road, Singanallur, Coimbatore, TN 641005",
                "latitude": 10.9992,
                "longitude": 77.0267,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Textile spinning motor units"
            },
            {
                "name": "Drop #6 - Saravanampatti IT Park",
                "customer_name": "CHIL-SEZ Technology Center",
                "customer_phone": "+91 422 266 0419",
                "customer_address": "Saravanampatti, Coimbatore, TN 641035",
                "latitude": 11.0805,
                "longitude": 76.9958,
                "is_warehouse": 0,
                "priority": "Urgent",
                "notes": "Enterprise network server switches"
            },
            {
                "name": "Drop #7 - Ukkadam Commercial Exchange",
                "customer_name": "South Kovai Wholesale Traders",
                "customer_phone": "+91 422 230 0480",
                "customer_address": "Palakkad Main Rd, Ukkadam, Coimbatore, TN 641001",
                "latitude": 10.9904,
                "longitude": 76.9602,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Bulk consumer provisions"
            },
            {
                "name": "Drop #8 - Kuniyamuthur Distribution Node",
                "customer_name": "Annamalai Agro Supplies",
                "customer_phone": "+91 422 225 0533",
                "customer_address": "Kuniyamuthur, Coimbatore, TN 641008",
                "latitude": 10.9634,
                "longitude": 76.9535,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Agricultural drip machinery"
            },
            {
                "name": "Drop #9 - Thudiyalur Engineering Works",
                "customer_name": "Texcity Spares Corp",
                "customer_phone": "+91 422 264 0610",
                "customer_address": "Mettupalayam Rd, Thudiyalur, Coimbatore, TN 641034",
                "latitude": 11.0772,
                "longitude": 76.9388,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "High-tensile fasteners"
            }
        ]
    },
    "madurai": {
        "title": "Madurai Heritage & Trade Express",
        "description": "Temple city courier route covering Mattuthavani, Simmakkal, Anna Nagar, and Pasumalai.",
        "warehouse": {
            "name": "Mattuthavani Logistics Depot",
            "customer_name": "RouteGen Pandian Hub",
            "customer_phone": "+91 452 258 0912",
            "customer_address": "Melur Road, Mattuthavani, Madurai, TN 625007",
            "latitude": 9.9405,
            "longitude": 78.1568,
            "is_warehouse": 1,
            "priority": "High",
            "notes": "Fleet staging area near integrated bus terminal"
        },
        "deliveries": [
            {
                "name": "Drop #1 - Simmakkal Wholesale Market",
                "customer_name": "Meenakshi Spices & Dry Fruits",
                "customer_phone": "+91 452 233 0134",
                "customer_address": "Vakkil New Street, Simmakkal, Madurai, TN 625001",
                "latitude": 9.9298,
                "longitude": 78.1214,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Food-grade spice sacks"
            },
            {
                "name": "Drop #2 - Meenakshi Amman Temple Zone",
                "customer_name": "Chithirai Silk & Brassware",
                "customer_phone": "+91 452 234 0244",
                "customer_address": "South Chithirai Street, Madurai, TN 625001",
                "latitude": 9.9195,
                "longitude": 78.1193,
                "is_warehouse": 0,
                "priority": "High",
                "notes": "Handicraft temple bells and bronze icons"
            },
            {
                "name": "Drop #3 - Goripalayam Healthcare Center",
                "customer_name": "Vaigai Pharma Distribution",
                "customer_phone": "+91 452 253 0389",
                "customer_address": "Alagar Kovil Road, Goripalayam, Madurai, TN 625002",
                "latitude": 9.9325,
                "longitude": 78.1325,
                "is_warehouse": 0,
                "priority": "Urgent",
                "notes": "Critical cold-chain vaccines"
            },
            {
                "name": "Drop #4 - Anna Nagar Trade Complex",
                "customer_name": "Supreme Textile Showroom",
                "customer_phone": "+91 452 252 0471",
                "customer_address": "80 Feet Road, Anna Nagar, Madurai, TN 625020",
                "latitude": 9.9234,
                "longitude": 78.1488,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Apparel carton consignment"
            },
            {
                "name": "Drop #5 - K.K. Nagar Corporate Plaza",
                "customer_name": "Madurai Infotech Systems",
                "customer_phone": "+91 452 258 0520",
                "customer_address": "East 5th Cross St, K.K. Nagar, Madurai, TN 625020",
                "latitude": 9.9312,
                "longitude": 78.1512,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Workstation laptops and monitors"
            },
            {
                "name": "Drop #6 - Teppakulam Heritage Quarter",
                "customer_name": "Vandiyur Crafts Emporium",
                "customer_phone": "+91 452 231 0601",
                "customer_address": "Mariamman Teppakulam Roundana, Madurai, TN 625009",
                "latitude": 9.9125,
                "longitude": 78.1534,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "Souvenir packaging"
            },
            {
                "name": "Drop #7 - Villapuram Logistics Point",
                "customer_name": "South Vaigai Transports",
                "customer_phone": "+91 452 267 0718",
                "customer_address": "Aruppukottai Main Rd, Villapuram, Madurai, TN 625012",
                "latitude": 9.9015,
                "longitude": 78.1287,
                "is_warehouse": 0,
                "priority": "Standard",
                "notes": "FMCG carton boxes"
            },
            {
                "name": "Drop #8 - Pasumalai Industrial Park",
                "customer_name": "Madura Coats Technical Fibers",
                "customer_phone": "+91 452 260 0882",
                "customer_address": "TPK Road, Pasumalai, Madurai, TN 625004",
                "latitude": 9.8970,
                "longitude": 78.0890,
                "is_warehouse": 0,
                "priority": "Urgent",
                "notes": "Industrial synthetic thread spools"
            }
        ]
    }
}

# Aliases for backward compatibility or direct queries
SAMPLE_SCENARIOS["tn"] = SAMPLE_SCENARIOS["chennai"]
SAMPLE_SCENARIOS["tamilnadu"] = SAMPLE_SCENARIOS["chennai"]
SAMPLE_SCENARIOS["nyc"] = SAMPLE_SCENARIOS["chennai"]
SAMPLE_SCENARIOS["sf"] = SAMPLE_SCENARIOS["coimbatore"]
SAMPLE_SCENARIOS["london"] = SAMPLE_SCENARIOS["madurai"]
