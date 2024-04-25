
// This is your new function. To start, set the name and path on the left.

exports.handler = function(context, event, callback) {


    async function main() {
    
    const password = event.request.headers['x-password']
    
        if (context.password !== password){
          return callback(null, { none: {error:'not the correct password'}})
        }
    
    try {
          const profiles = await numbers_profiles(event.request.headers['x-phonenumber'],event.request.headers['x-bundles'],event.request.headers['x-accountsidcheck'],event.request.headers['x-bundlesidcheck']);
       
          if (Object.keys(profiles).length <1){
            callback(null, {no_results: {message: 'Please check if filters are correct'}});
          }
          else{
          callback(null, profiles);
          }
    
        } catch (error) {
          callback(null, {no_results: {message: 'Please check if filters are correct'}});
        }
      
    }
    event.request.headers['x-bundlesidcheck']
    
    main()
    
    async function profiles_under_account(accountsidcheck,bundlesidcheck){
    
    //getting auth/accound sid for all subaccounts
    const dataArray = await fetchAccountdata()
    //getting all bundles on subaccounts
    const resultArray = await processDataArray(dataArray,accountsidcheck,bundlesidcheck)
    return resultArray
    
    };
    
    async function numbers_profiles(numberList,bundleList,accountsidcheck,bundlesidcheck){
      const sidArray = []
      const arraySids = []
    
      //make array
      const numbersArray = numberList.split(',');
      
      const clients = await fetchSingleAccountdata(accountsidcheck)
    
    if ((!clients || clients.length < 1 || !clients[0] || clients[0].length < 1) && accountsidcheck.length>0 ) {
      return { no_results: { message: 'Please enter a valid account sid' } };
    }
    
    
    if ((!clients || clients.length < 1 || !clients[0] || clients[0].length < 1) && (accountsidcheck.length ==0) && (bundlesidcheck.length>0 || numberList.length>0) ) {
      return { no_results: { message: 'Please enter an account sid' } };
    }
    
      //check if number are entered, get pn sids
      if(numberList.length >1){
    
      const arraySids = await get_pn_sids(numbersArray,clients[0],clients[1])
    
      if (arraySids.length==0){
        return { no_results: { message: 'Please enter valid numbers for the given account sid' } }
      }
    
      arraySids.forEach(item => {
      const { sid, number } = item;
      sidArray.push(sid)
    
      });
      }
    
    
    
    //returns bundles under account
    const bundles = await profiles_under_account(accountsidcheck,bundlesidcheck);
    
    
    
    const trustProfileSids = bundles.TrustProfile.map(profile => ({ policySid: profile.policySid, sid: profile.sid,policyID: profile.policyID,accountSID: profile.accountSID, token: profile.token }));
    
    const CustomerProfile = bundles.CustomerProfile.map(profile => ({ policySid: profile.policySid, sid: profile.sid,policyID: profile.policyID,accountSID: profile.accountSID, token: profile.token }));
    
    
    
    // Log the result
    const resultDictionary = {};
    
    for (let i = 0; i < CustomerProfile.length; i++) {
      // Assuming policyID is the property name in CustomerProfile
    
      if (bundleList.includes(CustomerProfile[i].policyID)) {
    
        const client1 = require('twilio')(CustomerProfile[i].accountSID, CustomerProfile[i].token);
       const response = await client1.trusthub.v1.customerProfiles(CustomerProfile[i].sid)
        .customerProfilesChannelEndpointAssignment
        .page({ pageSize: 1 })
    
    
    
       
        const data = await paginationRaw(response,CustomerProfile[i].accountSID,CustomerProfile[i].token)
    
    //console.log("micah",data)
    
            const test = data.reduce((acc, t) => {
                    const pnSID = t.channel_endpoint_sid || t.channelEndpointSid;
                    const customerSid = t.customerProfileSid ||t.customer_profile_sid;
                    if (!acc[pnSID]) {
                        acc[pnSID] = { accountSID: CustomerProfile[i].accountSID, [CustomerProfile[i].policySid]: customerSid, token: CustomerProfile[i].token };
                    } else {
                        acc[pnSID][CustomerProfile[i].policySid] = customerSid;
                    }
                    return acc;
                }, {});
    
      //console.log(test,"micah2")
         
        // Merge entries with the same pnSID
        Object.keys(test).forEach(pnSID => {
          if (!resultDictionary[pnSID]) {
            resultDictionary[pnSID] = test[pnSID];
          } else {
            Object.assign(resultDictionary[pnSID], test[pnSID]);
          }
        });
      }
      // console.log(test);
    }
    
    
    
    
    
    
    for (let i = 0; i < trustProfileSids.length; i++) {
      // Assuming policyID is the property name in CustomerProfile
    
      if (bundleList.includes(trustProfileSids[i].policyID)) {
    
        const client2 = require('twilio')(trustProfileSids[i].accountSID, trustProfileSids[i].token);
    
       const response = await client2.trusthub.v1.trustProducts(trustProfileSids[i].sid)
        .trustProductsChannelEndpointAssignment
        .page({ pageSize: 1 })
    
    
    
       
        const data = await paginationRaw(response,trustProfileSids[i].accountSID,trustProfileSids[i].token)
    
    console.log("micahdata",data)
    
           const test = data.reduce((acc, t) => {
                    const pnSID = t.channel_endpoint_sid || t.channelEndpointSid;
                    const trustSid = t.trustProductSid ||t.trust_product_sid;
                    if (!acc[pnSID]) {
                        acc[pnSID] = {accountSID: trustProfileSids[i].accountSID, [trustProfileSids[i].policySid]: trustSid, token: trustProfileSids[i].token };
                    } else {
                        acc[pnSID][trustProfileSids[i].policySid] = trustSid;
                    }
                    return acc;
                }, {});
    
    
    
    console.log(test,"micahphelps")
    
        //console.log(pnSID)
      // Merge entries with the same pnSID
      Object.keys(test).forEach(pnSID => {
        if (!resultDictionary[pnSID]) {
          resultDictionary[pnSID] = test[pnSID];
        } else {
          Object.assign(resultDictionary[pnSID], test[pnSID]);
        }
      });
      }
    
    }
    
    if (sidArray.length >0) {
    Object.keys(resultDictionary).forEach(key => {
      if (!sidArray.includes(key)) {
        delete resultDictionary[key];
      }
    });
    
    
    
    arraySids.forEach(item => {
      const { sid, number } = item;
    
      // Check if the sid entry exists in the dictionary
      if (resultDictionary.hasOwnProperty(sid)) {
        // Add or update the number property in the dictionary
        resultDictionary[sid].number = number;
      } 
    });
    }
    /*
        for (let key in obj) {
            if (!obj[key]. ) {
                delete obj[key];
            }
        }
        */
    //converts PN SIDS to numbers ... maybe change this to.. dumb
    
    
    for (const [key, value] of Object.entries(resultDictionary)) {
      const phoneNumber = await SidtoNumber(key,value.accountSID,value.token);
      resultDictionary[key]['Phone number'] = phoneNumber;
    }
    
    
    for (const key in resultDictionary) {
        if (resultDictionary.hasOwnProperty(key)) {
            // Get the object associated with the current key
            const obj = resultDictionary[key];
    
            // Check if the 'token' property exists in the object
            if ('token' in obj) {
                // Delete the 'token' property from the object
                delete obj.token;
            }
        }
    }
    
    
    return resultDictionary
    
    }
    
    async function SidtoNumber(number,accountSID,token){
      const client = require('twilio')(accountSID, token);
    
      return client.incomingPhoneNumbers(number)
        .fetch()
        .then(incoming_phone_number => incoming_phone_number.friendlyName);
      
    
    }
    async function get_business_sid(sid,token,bundle) {
    
      const regulationSidMapping = {
        "RN6433641899984f951173ef1738c3bdd0": "primary-business-profile",
        "RN7a97559effdf62d00f4298208492a5ea": "STIR / SHAKEN",
        "RNf3db3cd1fe25fcfd3c3ded065c8fea53": "CNAM",
        "RNdfbf3fae0e1107f8aded0e7cead80bf5": "secondary-business-profile",
        "RNb0d4771c2c98518d916a3d4cd70a8f8b": "A2P",
        "RN806dd6cd175f314e1f96a9727ee271f4": "ISV Starter customer profile",
        "RN670d5d2e282a6130ae063b234b6019c8": "SoleProp (previously ISV Starter A2P)",
        "RN13dc4be8861a10924a79c35eaa4d812c": "Direct Starter customer profile (direct-long tail)",
        "RN63da8244384cf0401c39f5f91e674db5": "Starter A2P (direct customers)",
        "RN92dc6c39189b4d5ad9c6664f39769f90": "Government primary customer profile",
        "RN074d26323ad8ca107761a5edf4191ba7": "Government secondary customer profile",
        "RN936f6140f1864391adca88df5d84cb6d": "Nonprofit primary customer profile",
        "RNaf459d36b007ba6db226cd43a816cfa0": "Nonprofit secondary customer profile",
        "RNa282dd7f3dbef8586501ca2e045e764c": "Toll Free",
        "RN5b3660f9598883b1df4e77f77acefba0": "Voice Integrity",
        "RNca63d1066fbd5e44eac02d0b3cf6d019": "Branded Calling",
        "RNffcb02a20420c81caf596ffc44f69712": "Individual Primary customer profile"
        // Add more mappings as needed
    };
    
     const client = require('twilio')(sid,token);
    
    
    try {
        const response = await client.trusthub.v1.customerProfiles.page({ pageSize: 1 });
        const data = await paginationRaw(response, sid, token);
    
        if (bundle.length > 0) {
            return data
                .filter(c => c.sid === bundle) // Filter to keep only objects where sid equals bundle
                .map(c => ({
                    sid: c.sid,
                    token: token,
                    friendlyName: c.friendlyName || c.friendly_name,
                    accountSID: c.accountSid || c.account_sid,
                    policyID: c.policySid || c.policy_sid,
                    policySid: regulationSidMapping[c.policySid] || regulationSidMapping[c.policy_sid]
                }));
        } else {
            // If bundle length is not greater than 0, return an empty array
            return data
                .map(c => ({
                    sid: c.sid,
                    token: token,
                    friendlyName: c.friendlyName || c.friendly_name,
                    accountSID: c.accountSid || c.account_sid,
                    policyID: c.policySid || c.policy_sid,
                    policySid: regulationSidMapping[c.policySid] || regulationSidMapping[c.policy_sid]
                }));
        }
    } catch (error) {
        // Handle any errors that occur during the asynchronous operations
        console.error("Error:", error);
        // Return an appropriate value or throw the error depending on your requirements
        throw error; // or return [];
    }
    
      
    
      //
    }
    
    async function get_trust_sid(sid,token,bundle) {
      const regulationSidMapping = {
        "RN6433641899984f951173ef1738c3bdd0": "primary-business-profile",
        "RN7a97559effdf62d00f4298208492a5ea": "STIR / SHAKEN",
        "RNf3db3cd1fe25fcfd3c3ded065c8fea53": "CNAM",
        "RNdfbf3fae0e1107f8aded0e7cead80bf5": "secondary-business-profile",
        "RNb0d4771c2c98518d916a3d4cd70a8f8b": "A2P",
        "RN806dd6cd175f314e1f96a9727ee271f4": "ISV Starter customer profile",
        "RN670d5d2e282a6130ae063b234b6019c8": "SoleProp (previously ISV Starter A2P)",
        "RN13dc4be8861a10924a79c35eaa4d812c": "Direct Starter customer profile (direct-long tail)",
        "RN63da8244384cf0401c39f5f91e674db5": "Starter A2P (direct customers)",
        "RN92dc6c39189b4d5ad9c6664f39769f90": "Government primary customer profile",
        "RN074d26323ad8ca107761a5edf4191ba7": "Government secondary customer profile",
        "RN936f6140f1864391adca88df5d84cb6d": "Nonprofit primary customer profile",
        "RNaf459d36b007ba6db226cd43a816cfa0": "Nonprofit secondary customer profile",
        "RNa282dd7f3dbef8586501ca2e045e764c": "Toll Free",
        "RN5b3660f9598883b1df4e77f77acefba0": "Voice Integrity",
        "RNca63d1066fbd5e44eac02d0b3cf6d019": "Branded Calling",
        "RNffcb02a20420c81caf596ffc44f69712": "Individual Primary customer profile"
        // Add more mappings as needed
    };
    
      const client = require('twilio')(sid,token);
    
    
    
    try {
        const response = await client.trusthub.v1.trustProducts.page({ pageSize: 1 });
        const data = await paginationRaw(response, sid, token);
    
        if (bundle.length > 0) {
            return data
                .filter(c => c.sid === bundle) // Filter to keep only objects where sid equals bundle
                .map(c => ({
                    sid: c.sid,
                    token: token,
                    friendlyName: c.friendlyName || c.friendly_name,
                    accountSID: c.accountSid || c.account_sid,
                    policyID: c.policySid || c.policy_sid,
                    policySid: regulationSidMapping[c.policySid] || regulationSidMapping[c.policy_sid]
                }));
        } else {
            // If bundle length is not greater than 0, return an empty array
            return data
                .map(c => ({
                    sid: c.sid,
                    token: token,
                    friendlyName: c.friendlyName || c.friendly_name,
                    accountSID: c.accountSid || c.account_sid,
                    policyID: c.policySid || c.policy_sid,
                    policySid: regulationSidMapping[c.policySid] || regulationSidMapping[c.policy_sid]
                }));
        }
    } catch (error) {
        // Handle any errors that occur during the asynchronous operations
        console.error("Error:", error);
        // Return an appropriate value or throw the error depending on your requirements
        throw error; // or return [];
    }
    
    
    
    
    }
    // 
    
    
    async function get_pn_sids(numbers,sid,token) {
    
    const client = require('twilio')(sid, token);
    
    
       sids = [] 
    for (const number of numbers) {
      try {
        const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ phoneNumber: number, limit: 1 });
    
        if (incomingPhoneNumbers.length > 0) {
          const orderedPair = { sid: incomingPhoneNumbers[0].sid, number: number };
          sids.push(orderedPair); // push both sid/number in same entry
        }
      } catch (error) {
        console.error(`Error fetching incoming phone numbers for ${number}:`, error);
        // Handle the error as needed, such as logging it or performing other actions.
        // Depending on your use case, you might want to continue processing other numbers despite the error.
        // If so, you can use 'continue;' to skip the current iteration and move to the next number.
      }
    }
    
      console.log(sids)
      return sids;
    }
    
    async function fetchAccountdata() {
        try {
          client = context.getTwilioClient()
          const accounts = await client.api.v2010.accounts.page({ pageSize: 1000 });
          console.log(accounts,"MICAHHHH")
          const response = await paginationRaw(accounts, '', '');
          console.log(response,"sdfsdfs")
    
          // Extract account SID and auth token information into an array
          const data = response.map(account => ({
            accountSid: account.sid,
            authToken: account.authToken || account.auth_token
          }));
          return data
      
          // Log the result
          //console.log(data);
      
          // Use data or pass it to another function
          
        } catch (error) {
          console.error(error);
        }
      }
    
    //getting bundles under parent
      async function processDataArray(dataArray,accountSID,bundlesidcheck) {
    
        const accountSIDCheck = accountSID.length
        const resultObject = {
        CustomerProfile: [],
        TrustProfile: []
      };
    
      for (const item of dataArray) {
    
    
        if (item.accountSid == accountSID || accountSIDCheck<1){
        const [b_data, t_data] = await Promise.all([
          get_business_sid(item.accountSid, item.authToken,bundlesidcheck),
          get_trust_sid(item.accountSid, item.authToken,bundlesidcheck)
        ]);
    
    
    
        resultObject.CustomerProfile.push(...b_data);
        resultObject.TrustProfile.push(...t_data);
    
     // }
    }
    
      }
    
      return resultObject
    
      }
    
    
      async function fetchSingleAccountdata(accountSID) {
      
      try {
    
        const client = context.getTwilioClient()
    
        const account = await client.api.v2010.accounts(accountSID).fetch();
     
        return [account.sid, account.authToken];
    
        // Extract account SID and auth token information into an array
    
    
    
        // Log the result
        //console.log(data);
    
        // Use data or pass it to another function
      } catch (error) {
       return['','']
    
      }
    }
    
    
    async function paginationRaw(response,sid,token) {
    let client;
    if (sid.length>0 && token.length>0){
     client = require("twilio")(sid, token );
    }
    else{
    client = context.getTwilioClient()
    }
      var array = []
    
    
      let nextPageUrl = response.nextPageUrl || (response.body && response.body.meta && response.body.meta.next_page_url);
    
    
    let continueLoop = true;
    
    while(continueLoop){
    
    
    
      let data;
      if (
        response.instances &&
        Array.isArray(response.instances) &&
        response.instances.length > 0
      ) {
        data = response.instances;
        for (let i = 0; i < data.length; i++) {
    array.push(data[i])
        }
      } else  if (
        response.body?.results &&
        Array.isArray(response.body.results) &&
        response.body.results?.length > 0
      ) {
        data = response.body.results;
        for (let i = 0; i < data.length; i++) {
          array.push(data[i])
        }
      }
    
    
    
    
    
      if (nextPageUrl) {
    
          response = await client.request({
            method: "GET",
            uri: nextPageUrl,
          });
        console.log(response.body,"mtestte")
        nextPageUrl = response.body.meta.next_page_url
        
      } else {
      continueLoop = false
      }
    }
      return array
    }
    
    
    
    };