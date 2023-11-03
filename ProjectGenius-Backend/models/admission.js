const mongoose = require('mongoose');
const { Schema } = mongoose;


const admissionSchema = new Schema ({
    'studentId':String,
    'name' : String,
    'dob' :String,
    'age':Number,
    'email':String,
    'photo':String,
    'placeofbirth':String,
    'contactNumber':Number,
    'whatsappNumber':Number,
    'aadhaarNumber':String,
    'permanentaddress':String,
    'temporaryaddress':String,
    'bloodgroup':String,
    'admissiongrade':String,
    'previousgrade':String,
    'previousschoolhistory':String,
    // 'parentsoccupation':String,
    'emergencycontactNumber':Number,
    'emergencyrelationname':String,
    // 'emergencyrelationtype':String,
    'vaccination':String,
    'signature':String,
    'fathername':String,
    'mothername':String,
    'fatherphonenumber':Number,
    'motherphonenumber': Number,
    'doj':String,
    'active':{
        type: Number,
        default: 1
    },
})

let admissionModel = mongoose.model('admission', admissionSchema, 'admission' )


module.exports = admissionModel;