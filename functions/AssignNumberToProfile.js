
// This is your new function. To start, set the name and path on the left.

exports.handler = function(context, event, callback) {
    async function main() {
    
        const password = event.request.headers['x-password']
        console.log(password,"password")
    
        if (context.password !== password){
          return callback(null, { none: {error:'not the correct password'}})
        }
      var numberToList = event.request.headers['x-phonenumber']
      var bundleToList = event.request.headers['x-bundles']
      var accountSid = event.request.headers['x-account']
      const numbersArray = numberToList.split(',')
      const bundlesArray = bundleToList.split(',')
      const numbers = await pn_sids(numbersArray,accountSid);
      const bundles = await getNumberInfo('','',password)
    
      var responsedic = {}
    
    console.log(numbers)   
              for (var bundle of bundlesArray){
                console.log(bundle,"midshsfh")
                const info =  retrieveInfo(bundles,bundle)
                for (var number of numbers){
                  if (number.length == 2){
                        if (!responsedic.hasOwnProperty(number[0])) {
                            responsedic[number[0]] = {};
                          } 
                    responsedic[number[0]][bundle] = number[1]
                  }
                  else if (info == 'customer'){
                    console.log('customer')
                    console.log(bundle,number[0],number[3],number[2])
                    const response = await assign_number_customer(bundle,number[0],number[3],number[2],number[1])
                          if (!responsedic.hasOwnProperty(response[0][0])) {
                              responsedic[response[0][0]] = {};
                          } 
                          responsedic[response[0][0]][response[0][1]] = response[0][2]
                  }
    
                  else if (info == 'trust'){
                    console.log('trust')
                    console.log(bundle,number[0],number[2],number[3])
                    const response = await assign_number_trust(bundle,number[0],number[3],number[2],number[1])
                    console.log(response,"midfshujdfhsjdfhjsd")
                          if (!responsedic.hasOwnProperty(response[0][0])) {
                              responsedic[response[0][0]] = {};
                          } 
                          responsedic[response[0][0]][response[0][1]] = response[0][2]         
                  }
                  else {
    
                if (!responsedic.hasOwnProperty(number[1])) {
                  responsedic[number[1]] = {};
                } 
                  responsedic[number[1]][bundle] = info
                }
                    
                }
    console.log(responsedic,"micahhhh")
              }
    
    
        try {
        // Send the successful response to Twilio
        callback(null, responsedic);
        }
       catch (error) {
        console.error('Error in main function:', error);
        // Send an error response to Twilio
        callback(`Internal Server Error: ${error}`);
      
      }
    }
    main()
    
        //have to convert phone numbers to sid
    async function assign_number_customer(bundle_sid,phone_number,auth_token,account_sid,did){
      const tempArray = []
      const client = require('twilio')(account_sid, auth_token);
    try{
    await client.trusthub.v1.customerProfiles(bundle_sid)
      .customerProfilesChannelEndpointAssignment
      .create({
         channelEndpointType: 'phone-number',
         channelEndpointSid: phone_number
       })
      .then(customer_profiles_channel_endpoint_assignment => tempArray.push([did,bundle_sid,'success']));
      return tempArray
        } catch (error) {
        console.error('Failed to assign number to trust:', error);
        const commastring = JSON.stringify(error)
        tempArray.push([did,bundle_sid,commastring.replace(/,/g, ':')])
        return tempArray
      }
    }
    
    //have to convert phone numbers to sid
    async function assign_number_trust(bundle_sid,phone_number,auth_token,account_sid,did) {
      const tempArray = []
      
      console.log("assign",bundle_sid,phone_number,auth_token,account_sid)
      try {
        const client = require('twilio')(account_sid, auth_token);
    
    await client.trusthub.v1.trustProducts(bundle_sid)
      .trustProductsChannelEndpointAssignment
      .create({
         channelEndpointType: 'phone-number',
         channelEndpointSid: phone_number
       })
      .then(trust_products_channel_endpoint_assignment => tempArray.push([did,bundle_sid,'success']));
    
       
        return tempArray; // Return the result for further processing if needed
      } catch (error) {
        const commastring = JSON.stringify(error)
        tempArray.push([did,bundle_sid,commastring.replace(/,/g, ':')])
        
        return tempArray
      }
    }
    
    
    
            function retrieveInfo(bundlesOnAccount,bundle){
              console.log(bundlesOnAccount,bundle, "testerino")
              
              try {
                  const bundledic = bundlesOnAccount[bundle];
    
                  if (bundledic.type === "business") {
                      return 'customer';
                  }
    
                  if (bundledic.type === "trust") {
                      return 'trust';
                  }
                  else{
                    return 'Bundle found but no type connected to it'
                  }
              } catch (error) {
                  // Handle the error here
                  return 'Not a Valid Bundle on this account'
                  // Optionally, return a default value or rethrow the error
              }
    
    
    
            }
            async function getNumberInfo(selectedType,accountSidValue,password) {
                try {
                    const url = 'https://trusthub-5567.twil.io/BundlesOnAccount.js';
    
                    const response = await fetch(url, {
                    method: 'POST', // Use 'GET' method to include parameters in headers
                    headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Type': selectedType,
                    'X-AccountSid': accountSidValue,
                    'X-Password': password
    
        // Add any other headers you may need
      },
    });
    
                    const responseData = await response.json();
    
                    //updateResponseContainer(responseData);
                    //callback(null,{"completed": "mice"})
                    return responseData
                } catch (error) {
                    console.error('Error fetching data:', error.message);
                }
            }
    
    async function pn_sids(numbers, inputSID) {
      
        let finalArray = [];
      try {  
        // Fetch account data
        const account_data = await fetchAccountdata(inputSID);
    
        // Create Twilio client
        const client = require("twilio")(
          account_data[0],
          account_data[1]
        );
    
        // Initialize sids object
        const sids = {};
    
        
        const response = await client.incomingPhoneNumbers.page({ pageSize: 5})
        const data = await paginationRaw(response,account_data[0],account_data[1])
        // Retrieve incoming phone numbers and populate sids object
    
        for (const i of data) {
      sids[i.sid] = [i.accountSid || i.account_sid, account_data[1]];
    }
    
        // Get sid-number pairs for each number
        const numberPair = await get_pn_sids(numbers, client);
        
        // Process each sid-number pair
        for (const obj of numberPair) {
          if ('error' in obj) {
            finalArray.push([obj.number, obj.error]);
          } else {
            finalArray.push([obj.sid, obj.number, sids[obj.sid][0], sids[obj.sid][1]]);
          }
        }
    
        return finalArray;
      } catch(error) {
        // Handle errors related to the overall process
        finalArray.push([inputSID,error.message])
        return finalArray
      }
    }
    
    
    
     async function get_pn_sids(numbers,client) {
    
      const sids = [];
    
    
      for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
    
        try {
    
    
          // Make an asynchronous call to retrieve incoming phone numbers
    
       
          
          const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ phoneNumber: number, limit: 1 });
    
    
          // Process each incoming phone number and push its sid to the sids array
          if (incomingPhoneNumbers.length > 0) {
    
            const orderedPair = { sid: incomingPhoneNumbers[0].sid, number: number };
            sids.push(orderedPair); // Push both sid/number in the same entry
          }
          else{
            const orderedPair = { error: 'invalid number',number: number};
            sids.push(orderedPair);
          }
        } catch (error) {
          const orderedPair = { error: error,number: number};
            sids.push(orderedPair); // Push both sid/number in the same entry
          // Optionally, handle the error (e.g., by continuing to the next iteration, logging the error, or modifying the return value)
        }
      }
    
      console.log(sids,"micaissssheereee")
    
      return sids;
    }
    
    
    
    
    
    
    
    
    
    async function fetchAccountdata(accountSID) {
      
      try {
        const client = context.getTwilioClient()
    
        const account = await client.api.v2010.accounts(accountSID).fetch();
     
        return [account.sid, account.authToken];
    
    
        // Extract account SID and auth token information into an array
    
    
    
        // Log the result
        //console.log(data);
    
        // Use data or pass it to another function
      } catch (error) {
        console.error(error);
      }
    }
    
    async function paginationRaw(response, sid, token) {
    
      
      let client;
      if (sid.length > 0 && token.length > 0) {
        client = require("twilio")(sid, token);
      } else {
        client = context.getTwilioClient();
      }
      var array = [];
    
      let nextPageUrl =
        response.nextPageUrl ||
        (response.body && response.body.meta && response.body.meta.next_page_url);
    
    
    
      let continueLoop = true;
    
      while (continueLoop) {
        console.log(response)
        let data;
        if (
          response.instances &&
          Array.isArray(response.instances) &&
          response.instances.length > 0
        ) {
          data = response.instances;
          for (let i = 0; i < data.length; i++) {
            array.push(data[i]);
          }
        } else if (
          response.body?.incoming_phone_numbers &&
          Array.isArray(response.body.incoming_phone_numbers) &&
          response.body.incoming_phone_numbers?.length > 0
        ) {
          data = response.body.incoming_phone_numbers;
          for (let i = 0; i < data.length; i++) {
            array.push(data[i]);
          }
        }
    
        if (nextPageUrl && nextPageUrl !== "https://api.twilio.comnull") {
          response = await client.request({
            method: "GET",
            uri: nextPageUrl,
          });
         // console.log(response.body.next_page_uri)
          nextPageUrl = "https://api.twilio.com" + response.body.next_page_uri;
        } else {
          continueLoop = false;
        }
      }
      return array;
    }
    
    };
    
