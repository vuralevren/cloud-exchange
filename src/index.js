const { createClient } = require("altogic");
const cheerio = require("cheerio");
const axios = require("axios");

/*
  Please see README.md for detailed information about request input parameters

  req variable has the following values, please note that these values can change.
      ids - endpoint path id parameters object
      query - reqeust query string parameters
      headers - request headers object 
      appParams - App parameters object
      client - request callers device type and IP information, 
      session - session of the user making the request
      appInfo - contextual information about the app and the environment 
      files - array of file objects
      body - request body JSON object. This can be a single JSON object or an array of JSON objects.

  res variable has:
      send(text, status) - Function to return text response. Status code defaults to 200
      json(object, status) - Function to return JSON response. Status code defaults to 200

  If an exception is thrown, a response with code 500 is returned.
*/

/*
  In order to use the Altogic client library you need to create an app and a client key in Altogic. 
  Additionally, if you will be using the Authentication module of this library, you might need to do 
  additional configuration in your app settings. 
  
  As input to createClient you need to provide your environement base URL and client-key. You can create
  a new environment or access your app envUrl from the Environments view and create a new clientKey from 
  App Settings/Client library view in Altogic Designer.

  Please set ENV_URL and CLIENT_KEY values below if you plan to use Altogic Client library in this function.
*/

module.exports = async function (req, res) {
  const ENV_URL = "https://exchange.c1-europe.altogic.com";
  const CLIENT_KEY = "b205444ca335499b9df8c01e4fee1f99";
  // Create a client for interacting with your backend app
  // You need to provide environment url and client key as input parameters
  let altogic;

  if (!ENV_URL || !CLIENT_KEY) {
    console.warn(
      "Client library environment URL and/or client key variables are not set. Unless these variables are set, the cloud function cannot use Altogic Client Library."
    );
  } else altogic = createClient(ENV_URL, CLIENT_KEY);

  const exchangeRates = [];
  let rowIndex = -1;

  const targetUrl = "https://www.isbank.com.tr/en/foreign-exchange-rates";
  const pageResponse = await axios.get(targetUrl);
  const $ = cheerio.load(pageResponse.data);

  $("tr")
    .find("td")
    .each((idx, ref) => {
      if ([0, 1, 2].includes(idx)) return;
      const index = idx - 3;

      if (index % 3 === 0) {
        rowIndex++;
        exchangeRates.push({});
      }
      const columnIndex = index % 3;
      const elem = $(ref);

      switch (columnIndex) {
        case 0:
          const elemArray = elem.text().trim().split(" ");
          const shortName = elemArray[0].substring(0, 3);
          const firstName = elemArray[elemArray.length - 2];
          const lastName = elemArray[elemArray.length - 1];
          exchangeRates[rowIndex]["name"] = firstName
            ? `${shortName} - ${firstName} ${lastName}`
            : `${shortName} - ${lastName}`;
          break;
        case 1:
          exchangeRates[rowIndex]["buyingRate"] = elem.text().trim();
          break;
        case 2:
          exchangeRates[rowIndex]["sellingRate"] = elem.text().trim();
          break;
        default:
          break;
      }
    });

  altogic.endpoint.put("/currently", exchangeRates);

  res.json(true);
};
