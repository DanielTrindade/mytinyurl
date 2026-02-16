
import * as cdk from 'aws-cdk-lib';

import * as ec2 from 'aws-cdk-lib/aws-ec2';

import * as iam from 'aws-cdk-lib/aws-iam';

import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import { Construct } from 'constructs';



interface ComputeStackProps extends cdk.StackProps {

  vpc: ec2.IVpc;

  dbSecret: secretsmanager.ISecret;

  dbEndpoint: string;

  dbSecurityGroup: ec2.ISecurityGroup;

}



export class ComputeStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: ComputeStackProps) {

    super(scope, id, props);



    // Security Group for Web Server

    const webSecurityGroup = new ec2.SecurityGroup(this, 'WebSecurityGroup', {

      vpc: props.vpc,

      description: 'Allow HTTP/HTTPS access',

      allowAllOutbound: true,

    });



    webSecurityGroup.addIngressRule(

      ec2.Peer.anyIpv4(),

      ec2.Port.tcp(80),

      'Allow HTTP traffic from anywhere'

    );



    // Allow access to Database

    props.dbSecurityGroup.addIngressRule(

      webSecurityGroup,

      ec2.Port.tcp(5432),

      'Allow PostgreSQL access from Web Server'

    );



    // IAM Role for EC2

    const role = new iam.Role(this, 'Ec2InstanceRole', {

      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),

    });



    // Grant permission to read DB Secret

    props.dbSecret.grantRead(role);



    // Add SSM Managed Policy (Replaces need for SSH keys)

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));



    // Grant permission to pull from ECR (if needed in future)

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));



    // User Data Script (Startup) - Modernized for AL2023

    const userData = ec2.UserData.forLinux();

    userData.addCommands(

      'yum update -y',

      'yum install -y docker git',

      'systemctl enable --now docker',

      'usermod -a -G docker ec2-user',



      // Install Docker Compose plugin (v2)

      'mkdir -p /usr/libexec/docker/cli-plugins',

      'curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-$(uname -m) -o /usr/libexec/docker/cli-plugins/docker-compose',

      'chmod +x /usr/libexec/docker/cli-plugins/docker-compose',



      // Setup Application Directory

      'mkdir -p /app',

      'cd /app',

      'echo "Ready to deploy!"'

    );



    // EC2 Instance (Free Tier eligible)

    const instance = new ec2.Instance(this, 'WebServerInstance', {

      vpc: props.vpc,

      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),

      machineImage: ec2.MachineImage.latestAmazonLinux2023(),

      securityGroup: webSecurityGroup,

      role: role,

      userData: userData,

      vpcSubnets: {

        subnetType: ec2.SubnetType.PUBLIC,

      },

      // keyName removed in favor of safe SSM access

    });



    new cdk.CfnOutput(this, 'InstancePublicIP', {

      value: instance.instancePublicIp,

      description: 'Public IP of the web server',

    });

  }

}