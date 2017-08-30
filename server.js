const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const endpoints = {
  fviedu: {
    action: "https://secure.velocify.com/Import.aspx?Provider=FVI&Client=30010&CampaignId=1025&Url=http://www.fvi.edu/thank-you/",
    validator: validateFVIForm,
    redirect: 'http://www.fvi.edu/thank-you/'
  }
}

let blackList = {};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.post('/form/:endpoint', (req,res)=>{
  let endpoint = endpoints[req.params.endpoint];
  if (typeof endpoint == 'undefined' )
    return res.setStatus(400).end("Wrong endpoint requested");

  let formResult = endpoint.validator(req.body);
  if (formResult === "valid") {
    fetch(endpoint.action)
    .then(res=>{
      console.log("Response from velocify endpoint:", res.status, res.statusText);
      return res.text();
    })
    .then(txt=>{
      console.log("Parsed response:", txt, "redirecting to", endpoint.redirect);
      res.redirect(endpoint.redirect);
    })
  }
  else {
    if (typeof blackList[req.ip] === 'undefined') blackList[req.ip] = 0;
    blackList[req.ip]++;
    if (blackList[req.ip] > 5){
      console.log("Detected over 5 suspicious requests from", req.ip);
      //timing them out...
    }
    else {
      res.end("invalid form values. Please copy and paste this message to vmoreno@techlaunch.io"+JSON.stringify(req.body, null, 2));
    }
  }
});

app.listen(1338, ()=>console.log("Techlaunch form service listening"));

//returns either the string "valid" or an error message
function validateFVIForm(theform){
  let errorMessage = "";
  let error = false;
  var phoneno = /^\d{10}$/;
  try{
    if (theform.first_name == ""){
      errorMessage = "Please enter your first name";
      error = true;

    }
    else if (containsNumber(theform.first_name) || containsNumber(theform.last_name) ){
        errorMessage = "Please enter a valid first name and last name";
        error = true;

    }
    else if (theform.last_name.value == ""){
        errorMessage = "Please enter last name";
        error = true;
    }
    else if (theform.email.value == ""){
        errorMessage = "Please enter your email address";
        error = true;
    }
    else if (theform.email.length > 0){
        var pattern = /^([a-zA-Z0-9_.-])+@([a-zA-Z0-9_.-])+\.([a-zA-Z])+([a-zA-Z])+/;
        if (!pattern.test(theform.email)) {
            errorMessage = "Please enter valid email address";
            error = true;
        }
    }

    else if (theform.day_phone == ""){
        errorMessage = "Please enter your Phone Number";
        error = true;
    }
    else if (!theform.day_phone.match(phoneno)){
        errorMessage = "Not a valid Phone Number";
        error = true;
    }
    else if (theform.zipcode == ""){
        errorMessage = "Please enter your zip code";
        error = true;
    }

    if (error) return errorMessage;
    else return "valid";
  }
  catch (err){
    console.log(err);
    return false;
  }
}

var nums = [0,1,2,3,4,5,6,7,8,9];
function containsNumber(str){
    return nums.reduce((acc,num)=>str.indexOf(""+num)>=0?true:acc||false, false);
}
