# SETTLE-IN-DASH

A decentralized betting platform built with a React frontend and a PHP/MariaDB backend, allowing users to create, accept, and settle bets (contracts) using DASH cryptocurrency.

## Overview

SETTLE-IN-DASH is a full-stack web application designed to facilitate peer-to-peer betting. Users can create contracts with specific questions, stakes, and deadlines, accept others' contracts, or settle outcomes, with a unique "twist" feature for automated resolution. The application is deployed on One.com with PHP and MariaDB support, showcasing a secure and scalable architecture.

## Features

- **Frontend**: React with hooks (`useContracts.js`) for dynamic contract management and a responsive UI.
- **Backend**: PHP API (`contracts.php`) handling CRUD operations for contracts, integrated with MariaDB.
- **Database**: MariaDB (`c0j58fq2y_contractsdb`) with a `contracts` table for persistent storage.
- **Security**: Database credentials stored in `config.php` (excluded via `.gitignore`) outside the web root, with `mysqli_real_escape_string` to prevent SQL injection.
- **CORS**: Configured to allow secure communication between the React frontend and PHP backend.
- **Deployment**: Hosted on One.com with static React files and PHP API.

## Live Demo

Visit the live application at [https://yourdomain.com](https://yourdomain.com) (replace with your actual domain once deployed).

## Screenshots

(Include screenshots or a demo video once deployed, e.g., contract creation UI, contract list, etc.)

## Tech Stack

- **Frontend**: React, JavaScript, HTML, CSS
- **Backend**: PHP 7/8 (One.com compatible)
- **Database**: MariaDB
- **Tools**: Node.js, npm, VSC, One.com File Manager, Git, GitHub

## Setup Instructions

To run the project locally or deploy it to a server:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/SETTLE-IN-DASH.git
   cd SETTLE-IN-DASH