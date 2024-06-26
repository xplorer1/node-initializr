let path = require('path');
let fs = require('fs-extra');
let child_process = require('child_process');
let utilities = require("./utilities");
let supported_dbs = utilities.SUPPORTED_DBS;
let supported_mail_clients = utilities.SUPPORTED_MAIL_CLIENTS;
let supported_auth_providers = utilities.SUPPORT_AUTH_PROVIDERS;
let supported_css_libs = utilities.SUPPORTED_CSS_LIBS;
let backend_apps = utilities.BACKEND_APPS;

let readline_sync = require('readline-sync');

let startCreateApp = (app_name, options) => {
    let is_backend = backend_apps.includes(options.framework);

    let target_path = path.join(process.cwd(), app_name);
    if(fs.existsSync(target_path) ) {

        let folder_confirm = readline_sync.keyInYN(`There is a folder with the name ${app_name} in this location. Okay to delete and continue? `);
        if(folder_confirm) {
            console.log("Removing folder...this might take a moment.");
            fs.removeSync(target_path);
            createApp(app_name, options, is_backend);

        } else {
            console.log("Aborting...");
            process.exit(1);
        }

    } else {
        createApp(app_name, options, is_backend);
    }
}

let createApp = (app_name, options, is_backend) => {
    options["dependencies"] = [];

    try {

        let target_path = path.join(process.cwd(), app_name);
        let template_path = '';
        switch (options.framework) {
            case "express":
                template_path = path.join(__dirname, '..', 'templates/express_template');
                break;
            case "react":
                template_path = path.join(__dirname, '..', 'templates/react_template');
                break;
            case "hapi":
                template_path = path.join(__dirname, '..', 'templates/hapi_template');
                break;
            case "nest":
                template_path = path.join(__dirname, '..', 'templates/nest_template');
                break;
            case "next":
                template_path = path.join(__dirname, '..', 'templates/next_template');
                break;
        }

        fs.copySync(template_path, target_path); //Copy template files.

        let dependencies_input = readline_sync.question("'SPACE' delimited list of dependencies to include? ");
        let _dependencies = utilities.getDefaultDependencies(options.framework);
        if(dependencies_input) {
            // Normalize the input by replacing commas with spaces for folks that would still add commas to the dependencies list.
            dependencies_input = dependencies_input.replace(/,/g, '');

            // Split the normalized input string into an array using spaces as the separator.
            dependencies_input = dependencies_input.split(' ');

            //Filter out dependencies from user input that are already part of the default dependencies.
            let filtered_list = dependencies_input.filter( element => !_dependencies.includes( element ) );
            _dependencies = _dependencies.concat(filtered_list);
        }

        options["dependencies"] = _dependencies;

        if(is_backend) {
            handleBackendConfigurations(app_name, options);
        } else {
            handleFrontendConfiguration(app_name, options);
        }

    } catch (err) {
        console.error(`Error generating '${options.framework}' app: ${err}`);
        process.exit(1);
    }
};

let handleFrontendConfiguration = (app_name, options) => {
    try {
        let css_lib = readline_sync.question(`CSS library to include? Supported libraries: ${supported_css_libs.join(", ")}: `);
        if(css_lib && !supported_css_libs.includes(css_lib)) {
            console.log(`Invalid css library. Supported libraries include: ${supported_css_libs.join(", ")}. Please try again.`);
            process.exit(1);
        } else {

            switch (css_lib) {
                case "bootstrap":
                    options["dependencies"].push("bootstrap");
                    break;
                case "antd":
                    options["dependencies"].push("antd");
                    break;
                case "material":
                    options["dependencies"].push("@mui/material", "@emotion/react", "@emotion/styled");
                    break;
            }
        }

        handlePackageJsonFile(app_name, options, false);

    } catch (error) {
        console.error(`Error adding css library: ${err}`);
        process.exit(1);
    }
}

let handleBackendConfigurations = (app_name, options) => {

    try {
        let db_input = readline_sync.question(`Include database set up? Supported databases: ${supported_dbs.join(", ")}: `);
        if(db_input && !supported_dbs.includes(db_input)) {
            console.log(`Invalid database name. Supported databases include: ${supported_dbs.join(", ")}. Please try again.`);
            process.exit(1);
        } else {

            switch (db_input) {
                case "mongo":
                    options["dependencies"].push("mongoose");
                    handleMongoDb(app_name);
                    break;
                case "postgres":
                    options["dependencies"].push("sequelize", "pg", "pg-hstore");
                    handleSqlDb(app_name, db_input);
                    break;
                case "mysql":
                    options["dependencies"].push("sequelize", "mysql2");
                    handleSqlDb(app_name, db_input);
                    break;
                case "mssql":
                    options["dependencies"].push("sequelize", "tedious");
                    handleSqlDb(app_name, db_input);
                    break;
                case "sqlite":
                    options["dependencies"].push("sequelize", "sqlite3");
                    handleSqlDb(app_name, db_input);
                    break;
                case "maria":
                    options["dependencies"].push("sequelize", "mariadb");
                    handleSqlDb(app_name, db_input);
                    break;
                default:
                    break;
            }   
        }

        let mail_input = readline_sync.question(`Include mail set up? Supported mail clients: ${supported_mail_clients.join(", ")}: `);
        if(mail_input && !supported_mail_clients.includes(mail_input)) {
            console.log(`Invalid mail client. Supported mail clients include: ${supported_mail_clients.join(", ")}. Please try again.`);
            process.exit(1);
        } else {
            options["dependencies"].push(mail_input);
            handleMailSetup(app_name);
        }

        let auth_input = readline_sync.question(`Include authentication set up? Supported authentication providers: ${supported_auth_providers.join(", ")}: `);
        if(auth_input && !supported_auth_providers.includes(mail_input)) {
            console.log(`Invalid authentication providers. Supported providers include: ${supported_auth_providers.join(", ")}. Please try again.`);
            process.exit(1);
        } else {
            options["dependencies"].push(auth_input);
            handleAuthSetUp(app_name);
        }

        handlePackageJsonFile(app_name, options, true);
    } catch (error) {
        console.error(`Error creating backend specific configurations: ${error}`);
        process.exit(1);
    }
}

let handlePackageJsonFile = (app_name, options, is_backend) => {
    let target_path = path.join(process.cwd(), app_name);

    let package_defaults = {
        "name": app_name,
        "description": options.framework + " application.",
        "version": "1.0.0",
        "scripts": {
            "start": "node server.js"
        },
        "dependencies": {},
        "devDependencies": {}
    };

    if(!is_backend) {
        package_defaults["scripts"]["start"] = "react-scripts start";
        package_defaults["scripts"]["build"] = "react-scripts build";
        package_defaults["scripts"]["test"] = "react-scripts test --watchAll --coverage";
        package_defaults["scripts"]["eject"] = "react-scripts eject";
        package_defaults["browserslist"] = {};
        package_defaults["browserslist"]["production"] = [ ">0.2%", "not dead", "not op_mini all"];
        package_defaults["browserslist"]["development"] = [ "last 1 chrome version", "last 1 firefox version", "last 1 safari version"];
    }

    let dependencies = options.dependencies || [];

    try {
        
        fs.outputJSON(target_path + "/package.json", package_defaults, { spaces: '\t' }) 
            .then(() => console.log("File created and data written successfully.")) 
            .catch((e) => console.log(e)); 

        if(dependencies) {
            //Install dependencies.
            console.log("Installing packages. This might take a couple of minutes.\n");
            console.log("Installing: ", dependencies.join(' '));

            //You need to figure out how to separate the installation of regular and dev dependencies. Now they are being installed as regular.
            //Also figure out why dependencies aren't being created in the package.json folder after their installation.
            child_process.execSync(`cd ${target_path} && npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
        }
        
        console.log(`${options.framework} app '${app_name}' generated successfully.`);

    } catch (error) {
        console.error(`Error creating package json file: ${error}`);
        process.exit(1);
    }
}

let handleMongoDb = (app_name) => {
    let target_path = path.join(process.cwd(), app_name);

    let mongoose_setup = `
let mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.DATABASE_URL, { 'keepAlive': true, useUnifiedTopology: true, useNewUrlParser: true, 'connectTimeoutMS': 0 });

let conn = mongoose.connection;
conn.on('error', function(err) {
    console.log('mongoose connection error:', err.message);
});`;

    try {
        fs.writeFileSync(target_path + "/src/models/index.js", mongoose_setup);

    } catch (error) {
        console.error(`Error creating mongo db set up: ${error}`);
        process.exit(1);
    }
}

let handleSqlDb = (app_name, dialect) => {
    let target_path = path.join(process.cwd(), app_name);
    
    let sql_setup = `
let { Sequelize } = require('sequelize');
let sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USERNAME, process.env.DATABASE_PASSWORD, {
    host: process.env.DATABASE_HOST,
    dialect: '${dialect}',
});

sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.');
}).catch((error) => {
    console.error('Unable to connect to the database: ', error);
});
    `;

    try {
        fs.writeFileSync(target_path + "/src/models/index.js", sql_setup);

    } catch (error) {
        console.error(`Error creating sql db set up: ${error}`);
        process.exit(1);
    }
}

let handleMailSetup = (app_name) => {
    let target_path = path.join(process.cwd(), app_name);

    let mail_setup = `
let nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: process.env.MAIL_AUTH_OBJECT
});`

    try {
        fs.writeFileSync(target_path + "/src/services/mail_service.js", mail_setup);

    } catch (error) {
        console.error(`Error creating mail service set up: ${error}`);
        process.exit(1);
    }
}

let handleAuthSetUp = (app_name) => {
    let target_path = path.join(process.cwd(), app_name);
    let auth_setup = `
let jwt = require("jsonwebtoken");
let secret_key = process.env.SECRET_KEY;

module.exports = {

    verifyAuthToken: async(req, res, next) => {
        try {
            if(!req.headers.authorization) return res.status(401).send({status: false, message: "Token required."});

            let token = req.header("Authorization").replace("Bearer ", "");
            if(!token) return res.status(401).send({status: false, message: "Token required."});

            if (token) {
                jwt.verify(token, secret_key, async function(err, verified) {
                    if (err) return res.status(401).send({status: false, message: err.message});

                    let obj = {};
                    obj.token = token;
                    req.verified = obj;

                    next();
                });
            } else {
                return res.status(401).send({status: false, message: "Token required." });
            }
        } catch (error) {
            console.log("#auth_token_error: ", error.message);
            return res.status(500).send({status: false, message: "There has been an error. Please try again later." });
        }
    }
}`

    try {
        fs.writeFileSync(target_path + "/src/middlewares/authentication.js", auth_setup);

    } catch (error) {
        console.error(`Error creating mail service set up: ${error}`);
        process.exit(1);
    }
}

module.exports = {
    startCreateApp: startCreateApp,
    createApp: createApp
}