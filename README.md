# User Authentication and Identity Module

# Testing

Before running any end-to-end testing you need to deploy the cognito configuration via CloudFormation. To deploy the configuration and download the client configs run the following AWS CLI commands.

* Deploy cognito configuration

```
aws --region us-east-1 cloudformation deploy --capabilities CAPABILITY_NAMED_IAM --template-file etc/aws-cfn-template.yml --stack-name idmtest --parameter-overrides prefix=idmtest
```

* Retrieve client configuration

```
echo -e "$(aws --region us-east-1 cloudformation describe-stacks --stack-name idmtest | grep -A 1 'CognitoJSConfig' | awk -F'"' '/OutputValue/{ print $4 }')" > etc/aws-exports.js
```