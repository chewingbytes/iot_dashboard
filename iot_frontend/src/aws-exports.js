const awsExports = {
  API: {
    GraphQL: {
      endpoint:
        "https://prnoteuhcbe5rjvuuyqg2nadnu.appsync-api.ap-southeast-1.amazonaws.com/graphql",
      region: "ap-southeast-1",
      defaultAuthMode: "apiKey",
      apiKey: process.env.REACT_APP_APPSYNC_API_KEY,
    },
  },
};

export default awsExports;