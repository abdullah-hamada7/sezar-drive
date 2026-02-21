const {
    SecretsManagerClient,
    GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const region = process.env.S3_REGION || "us-east-1";
const projectName = process.env.PROJECT_NAME || "sezar-drive";

const secretsClient = new SecretsManagerClient({ region });
const ssmClient = new SSMClient({ region });

/**
 * Fetches secrets from AWS Secrets Manager and SSM Parameter Store
 * and injects them into process.env
 */
async function loadSecrets() {
    if (process.env.NODE_ENV !== "production") {
        return;
    }

    console.log("Loading secrets from AWS...");

    try {
        // 1. Fetch from Secrets Manager
        const secretName = `${projectName}-prod-secrets`;
        const secretResponse = await secretsClient.send(
            new GetSecretValueCommand({ SecretId: secretName })
        );

        if (secretResponse.SecretString) {
            const secrets = JSON.parse(secretResponse.SecretString);
            Object.entries(secrets).forEach(([key, value]) => {
                process.env[key] = value;
            });
            console.log("Successfully loaded Secrets Manager configuration.");
        }

        // 2. Fetch from SSM Parameter Store
        const parameters = [
            { name: `/${projectName}/prod/DATABASE_URL`, envKey: "DATABASE_URL" },
            { name: `/${projectName}/prod/S3_BUCKET`, envKey: "S3_BUCKET" },
            { name: `/${projectName}/prod/S3_REGION`, envKey: "S3_REGION" },
        ];

        for (const param of parameters) {
            try {
                const response = await ssmClient.send(
                    new GetParameterCommand({ Name: param.name })
                );
                if (response.Parameter && response.Parameter.Value) {
                    process.env[param.envKey] = response.Parameter.Value;
                }
            } catch (err) {
                console.warn(`Could not load SSM parameter ${param.name}:`, err.message);
            }
        }

        // 3. Inject password into DATABASE_URL template
        if (process.env.DATABASE_URL && process.env.POSTGRES_PASSWORD) {
            process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
                "REPLACE_ME",
                process.env.POSTGRES_PASSWORD
            );
            console.log("Injected password into DATABASE_URL.");
        }

        console.log("Secrets loading complete.");
    } catch (error) {
        console.error("Critical error loading secrets from AWS:", error.message);
        // In production, we might want to exit if secrets fail to load
        if (process.env.NODE_ENV === "production") {
            process.exit(1);
        }
    }
}

module.exports = { loadSecrets };
