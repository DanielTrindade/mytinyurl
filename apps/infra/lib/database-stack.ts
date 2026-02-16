
import * as cdk from 'aws-cdk-lib';

import * as ec2 from 'aws-cdk-lib/aws-ec2';

import * as rds from 'aws-cdk-lib/aws-rds';

import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import { Construct } from 'constructs';



interface DatabaseStackProps extends cdk.StackProps {

  vpc: ec2.IVpc;

}



export class DatabaseStack extends cdk.Stack {

  public readonly databaseSecret: secretsmanager.ISecret;

  public readonly endpoint: string;

  public readonly securityGroup: ec2.SecurityGroup;



  constructor(scope: Construct, id: string, props: DatabaseStackProps) {

    super(scope, id, props);



    // Security Group for Database

    this.securityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {

      vpc: props.vpc,

      description: 'Security group for RDS database',

      allowAllOutbound: true,

    });



    // Create Database Credentials Secret

    const databaseCredentialsSecret = new secretsmanager.Secret(this, 'DBCredentialsSecret', {

      secretName: 'mytinyurl-db-credentials',

      generateSecretString: {

        secretStringTemplate: JSON.stringify({

          username: 'postgres',

        }),

        excludePunctuation: true,

        includeSpace: false,

        generateStringKey: 'password',

      },

    });

    this.databaseSecret = databaseCredentialsSecret;



    // RDS Instance (Free Tier eligible)

    const dbInstance = new rds.DatabaseInstance(this, 'PostgresInstance', {

      engine: rds.DatabaseInstanceEngine.postgres({

        version: rds.PostgresEngineVersion.VER_16_1,

      }),

      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO), // Free Tier eligible

      vpc: props.vpc,

      vpcSubnets: {

        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Isolated Subnet (No NAT Gateway needed)

      },

      securityGroups: [this.securityGroup],

      credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),

      multiAz: false, // Free Tier is Single-AZ

      allocatedStorage: 20, // Free Tier limit is 20GB

      maxAllocatedStorage: 20, // Prevent auto-scaling storage costs

      storageType: rds.StorageType.GP2, // Force GP2 to avoid potential GP3 costs/issues in Free Tier

      publiclyAccessible: false, // Ensure it's not actually public

      removalPolicy: cdk.RemovalPolicy.DESTROY, // Destroy DB when stack is deleted

      deletionProtection: false, // Allow deletion for dev

    });



    this.endpoint = dbInstance.dbInstanceEndpointAddress;



    new cdk.CfnOutput(this, 'DatabaseEndpoint', {

      value: this.endpoint,

    });

  }

}

