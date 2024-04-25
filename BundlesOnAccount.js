
// This is your new function. To start, set the name and path on the left.

exports.handler = function(context, event, callback) {

    async function main(){  
      const accountSID = event.request.headers['x-accountsid']
      //console.log('testtt',accountSID)
      const dataArray = await fetchAccountdata()
      const password = event.request.headers['x-password']
    
          if (context.password !== password){
          return callback(null, { none: {error:'not the correct password'}})
        }
    
        
      const resultArray = await processDataArray(dataArray,accountSID)
      console.log(resultArray,"mixahah")
        try { 
        // Send the successful response to Twilio
        if(Object.keys(resultArray).length >0){
        callback(null, resultArray);
        }
        else{
          callback(null, {no_results: {message: 'Please check if provided account sid is valid, or if your account has any Trust Hub/Business Profiles'}})
        }
        }
       catch (error) {
        console.error('Error in main function:', error);
        // Send an error response to Twilio
        callback(`Internal Server Error: ${error}`);
      
      }
    }
    
    main();
      
    async function get_business_sid(sid,token) {
    const client = require("twilio")(sid, token );
    const response = await client.trusthub.v1.customerProfiles.page({ pageSize: 1 });
    
      const tempdic = await testfunc(response,sid,token,"business");
    
    
    return tempdic
    }
    
    async function get_trust_sid(sid,token) {
    const client = require("twilio")(sid, token );
    const response = await client.trusthub.v1.trustProducts.page({ pageSize: 1 });
    console.log(sid,token)
    console.log(response)
      //console.log(response)
    
      const tempdic = await testfunc(response,sid,token,"trust");
    
    return tempdic
            
    }
    
    
    
    async function fetchAccountdata() {
        try {
                client = context.getTwilioClient()
          const accounts = await client.api.v2010.accounts.page({ pageSize: 1000 });
    
          const response = await paginationRaw(accounts, '', '');
          
    
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
    
    
    async function processDataArray(dataArray, accountSID) {
        let combinedDict = {};
        const accountSIDCheck = accountSID.length;
    
        for (const item of dataArray) {
    
            if (item.accountSid === accountSID || accountSIDCheck < 1) {
                
                
    
                const businessSidData = await get_business_sid(item.accountSid, item.authToken);
    
                const trustSidData = await get_trust_sid(item.accountSid, item.authToken);
                combinedDict = { ...combinedDict, ...businessSidData, ...trustSidData };
                
            }
        }
        
        return combinedDict;
    }
    
    
    async function testfunc(response,sid,token,type) {
    const client = require("twilio")(sid, token );
      var array = []
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
          {array[data[i].sid] = {status: data[i].status,friendlyName: data[i].friendlyName.replace(/,/g, ':'),createdDate: data[i].dateCreated,policySid: data[i].policySid,accountSid:data[i].accountSid,policyName: regulationSidMapping[data[i].policySid],type:type}} ;
        }
      } else  if (
        response.body?.results &&
        Array.isArray(response.body.results) &&
        response.body.results?.length > 0
      ) {
        data = response.body.results;
        for (let i = 0; i < data.length; i++) {
           {array[data[i].sid] = {status: data[i].status,friendlyName: data[i].friendly_name.replace(/,/g, ':'),createdDate: data[i].date_created,policySid: data[i].policy_sid,accountSid:data[i].account_sid,policyName: regulationSidMapping[data[i].policy_sid],type:type}} ;
        }
      }
    
    
    
    
    
      if (nextPageUrl) {
    
          response = await client.request({
            method: "GET",
            uri: nextPageUrl,
          });
        
        nextPageUrl = response.body.meta.next_page_url
        
      } else {
      continueLoop = false
      }
    }
      return array
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