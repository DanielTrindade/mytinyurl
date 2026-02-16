# Deploying to AWS (Free Tier)

This guide explains how to deploy the `mytinyurl` infrastructure (EC2, RDS, S3, CloudFront) to AWS using the CDK.

## Prerequisites

1. **AWS Account**: You need an active AWS account.
2. **AWS CLI**: Installed and configured with your credentials.

    ```bash
    aws configure
    ```

    Enter your Access Key ID, Secret Access Key, Region (e.g., `us-east-1`), and Output format (`json`).

## deployment Steps

1. **Navigate to Infrastructure Directory**:

    ```bash
    cd apps/infra
    ```

2. **Install Dependencies** (if not already done):

    ```bash
    npm install
    ```

3. **Bootstrap CDK** (First time only):
    This sets up the necessary resources for CDK to manage your deployments (S3 buckets for state, etc.).

    ```bash
    npx cdk bootstrap
    ```

4. **Deploy Infrastructure**:
    This will calculate the diff and create all resources (VPC, RDS, EC2, S3, CloudFront).

    ```bash
    npx cdk deploy --all
    ```

    * Review the permissions changes and type `y` to confirm.
    * ☕ **Wait**: CloudFront distributions can take 5-10 minutes to create.

## Outputs

After deployment, CDK will output important information in your terminal:

* **DatabaseStack.DatabaseEndpoint**: The internal address of your RDS instance.
* **ComputeStack.InstancePublicIP**: The Public IP of your EC2 instance (Backend).
* **FrontendStack.CloudFrontURL**: The URL of your Frontend (HTTPS).

## Post-Deployment: Running the App

The current infrastructure provisioned:

* **Database**: Ready (Postgres 16).
* **Frontend**: Infrastructure ready, but you need to upload the files.
* **Backend**: Server ready (Docker installed), but no application running yet.

### 1. Upload Frontend

The CDK stack is configured to auto-deploy the `apps/frontend/dist` folder.
Ensure you have built the frontend locally first:

```bash
# In project root
npx turbo run build --filter=@mytinyurl/frontend
# Then redeploy stacks to sync files
cd apps/infra
npx cdk deploy FrontendStack
```

### 2. Run Backend (Manual Deployment for Verification)

Since we didn't set up a CI/CD pipeline or ECR registry (to keep costs zero/simple), the EC2 instance has Docker but no image.

## Option A: Manual SSH and Run (Simplest)

1. Connect to your EC2 (You need the KeyPair created in AWS Console if you specified one, or use Instance Connect in AWS Console).
2. Clone the repo or copy your code.
3. Run `docker compose up -d`.

## Option B: Docker Hub (Easier)

1. Build your image locally: `docker build -t youruser/mytinyurl-backend apps/backend`
2. Push to Docker Hub: `docker push youruser/mytinyurl-backend`
3. Update `ComputeStack` `user data` to pull `youruser/mytinyurl-backend`.

## Cleanup (Important!)

To avoid any unexpected costs, destroy the stack when you are done studying:

```bash
cd apps/infra
npx cdk destroy --all
```
