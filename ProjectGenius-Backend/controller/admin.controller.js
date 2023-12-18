const isEmpty = require('is-empty');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Models
const Admin = require('../models/admin');
const Admission = require('../models/admission');
const FeeSetup = require('../models/feesetup');
const FeeCollection = require('../models/feescollection');
const FeesPaid = require('../models/feespaid');
const TeacherAdmission = require('../models/teacheradmission');
const Schedule = require('../models/schedule');
const GroupSection = require('../models/groupsection');
const ClassAllocate = require('../models/classallocation');
const TeacherAttendance = require('../models/teacherattendance');

// config
const config = require('../config');

// lib
const sendMail = require('../lib/emailGateway');

//controll fuctions
const createadmin = async (req, res) => {
    let checkEmail = await Admin.findOne({ 'email': req.body.email }).lean()
    if (!isEmpty(checkEmail)) {
        return res.status(400).json({ 'status': false, 'errors': { 'email': 'Email already Exist' } })
    }
    //passwordhashing
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt);
    let newUser = new Admin({
        'email': req.body.email,
        'password': hash
    })
    await newUser.save();
    sendMail({
        'to': req.body.email,
        'content': '<h1>Registered successfully..!</h1>'
    })

    return res.status(200).json({ 'status': true, 'message': 'Registered successfully' })

}
const generateVerificationCode = () => {
    // Generate a random 6-digit verification code
    return Math.floor(100000 + Math.random() * 100000).toString();
};
const adminLogin = async (req, res) => {
    try {
        const admin = await Admin.findOne({ 'email': req.body.email }).lean(); // Assuming there's only one admin user
        if (!admin) {
            return res.status(400).json({ 'status': false, 'errors': { 'email': 'Invalid User EmailId' } });
        }
        const comparePassword = await bcrypt.compare(req.body.password, admin.password);
        if (!comparePassword) {
            return res.status(400).json({ 'status': false, 'errors': { 'password': 'Wrong password' } });
        }
        // Generate a 6-digit verification code
        const verificationCode = generateVerificationCode();

        // Save the verification code to the admin's account
        await Admin.updateOne({ '_id': admin._id }, { 'verificationCode': verificationCode });

        // Send the verification code via email
        const emailContent = `
            Your 6-digit verification code is: ${verificationCode}
            Please use this code to verify your email address.
        `;
        sendMail({
            to: admin.email, // Use the admin's email address
            content: emailContent,
        });
        let payload = { _id: admin._id }
        let token = jwtSign(payload)
        return res.status(200).json({ 'status': true, 'message': `A 6-Digit Verification Code send to ${admin.email}`, token });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
};
const ReverifyCode = async (req, res) => {
    try {
        const admin = await Admin.findOne({}).lean();
        const myemail = admin.email
        const verificationCode = generateVerificationCode();
        // Save the verification code to the admin's account
        await Admin.updateOne({ '_id': admin._id }, { 'verificationCode': verificationCode });
        // Send the verification code via email
        const emailContent = `
            Your 6-digit verification code is: ${verificationCode}
            Please use this code to verify your email address.
        `;
        sendMail({
            to: admin.email, // Use the admin's email address
            content: emailContent,
        });
        return res.status(200).json({ 'status': true, 'message': `A 6-Digit Verification Code send to ${admin.email}`, myemail });
    } catch (err) {
        console.log(err,'---err');
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' })
    }
}
const verifyCode = async (req, res) => {
    try {
        const { verificationCode } = req.body;
        const admin = await Admin.findOne({}).lean();
        if (!admin) {
            return res.status(400).json({ 'status': false, 'message': 'Admin user not found' });
        }
        if (admin.verificationCode !== verificationCode) {
            return res.status(400).json({ 'status': false, 'errors': { 'verificationCode': ' Wrong passcode,please re-enter correct one' } });
        }
        await Admin.updateOne({ '_id': admin._id }, { 'verificationCode': null });
        return res.status(200).json({ 'status': true, 'message': 'Verification successfull' });
    } catch (err) {
        console.log(err,'---err');
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
};
const jwtSign = (payload) => {
    let token = jwt.sign(payload, config.SECRET_KEY);
    return token;
}
const jwtVerify = (token) => {
    try {
        token = token.replace('Bearer ', '');
        let decoded = jwt.verify(token, config.SECRET_KEY);
        if (decoded) {
            return {
                'status': true,
                decoded
            }
        }
    } catch (err) {
        return {
            'status': false
        }
    }
}
const registerStudent = async (req, res) => {
    try {
        const maxStudent = await Admission.findOne({}, { studentId: 1 }).sort({ studentId: -1 });
        // Calculate the next student ID
        let nextStudentId = 'G0001'; // Default starting value
        if (maxStudent && maxStudent.studentId) {
            const currentMaxId = maxStudent.studentId;
            const seriesNumber = parseInt(currentMaxId.substring(1), 10) + 1;
            nextStudentId = `G${seriesNumber.toString().padStart(4, '0')}`;
        }
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const surName = req.body.surName;

        let FullName = `${firstName} ${lastName}`;

        if (surName !== undefined && surName !== "") {
            FullName += ` ${surName}`;
        }
        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;
        //for declare fees by admissiongrade wise
        const Feesdeclare = await FeeSetup.findOne({ admissiongrade: req.body.admissiongrade }, { totalfees: 1 }).lean()
        const FeesAmount = Feesdeclare.totalfees;
        let newDoc = new Admission({
            'studentId': nextStudentId,
            'name': FullName,
            'dob': req.body.dob,
            'age': req.body.age,
            'email': req.body.email,
            'photo': req.files.photo[0].filename,
            'emergencycontactNumber': req.body.emergencycontactNumber,
            'contactNumber': req.body.contactNumber,
            'whatsappNumber': req.body.whatsappNumber,
            'signature': req.files.signature[0].filename,
            'vaccination': req.body.vaccination,
            'placeofbirth': req.body.placeofbirth,
            'aadhaarNumber': req.body.aadhaarNumber,
            'permanentaddress': req.body.permanentaddress,
            'temporaryaddress': req.body.temporaryaddress,
            'bloodgroup': req.body.bloodgroup,
            'admissiongrade': req.body.admissiongrade,
            'previousgrade': req.body.previousgrade,
            'previousschoolhistory': req.body.previousschoolhistory,
            'emergencyrelationname': req.body.emergencyrelationname,
            'fathername': req.body.fathername,
            'mothername': req.body.mothername,
            'fatherphonenumber': req.body.fatherphonenumber,
            'motherphonenumber': req.body.motherphonenumber,
            'doj': formattedDate,
            'feesamount': FeesAmount,
        })
        await newDoc.save();
        return res.status(200).json({ 'status': true, 'message': " Register successfully" })
    } catch (err) {
        console.log(err, '--err')
    }
}
const studentaadhaarValid = async (req, res) => {
    try {
        let checkaadhaarNo = await Admission.find({}, { 'aadhaarNumber': 1, 'photo': 1, 'signature': 1 }).lean();
        return res.status(200).json({ 'status': true, result: checkaadhaarNo })
    } catch (err) {
        console.log(err, '---err')
    }
}
const viewStudent = async (req, res) => {
    try {
        const studentView = await Admission.find({}).lean();
        const sectionView = await GroupSection.find({}).lean();
        return res.status(200).json({ 'status': true, 'result': studentView, 'result2': sectionView, 'imageUrl': config.IMAGE.USER_FILE_URL_PATH })
    } catch (err) {
        return res.status(500).json({ 'status': false, 'message': 'Error on server' })
    }
}
const deleteStudent = async (req, res) => {
    if (isEmpty(req.params.id)) {
        return res.status(400).json({ 'status': false, 'message': '_Id is empty' });
    }
    try {
        const filter = { _id: req.params.id };
        const update = { active: '0' };

        const updatedData = await Admission.updateOne(filter, { $set: update });
        console.log(updatedData, '--data')
        if (updatedData && updatedData.modifiedCount > 0) {
            return res.status(200).json({ 'status': true, 'message': ' Data Deleted successfully' });
        } else {
            return res.status(200).json({ 'status': true, 'message': 'No matching records found' });
        }
    } catch (error) {
        console.log(error, '--errr')
        return res.status(500).json({ 'status': false, 'message': 'Internal Server Error' });
    }
}
const getSingleStudent = async (req, res) => {
    try {
        let studentData = await Admission.findOne({ _id: req.params.id }).lean();
        const [firstName, ...lastName] = studentData.name.split(" ");
        const LastName = lastName.join(" ");
        studentData.firstName = firstName;
        studentData.lastName = LastName;
        // Add the image URLs
        studentData.photo = `${config.IMAGE.USER_FILE_URL_PATH}/${studentData.photo}`;
        studentData.signature = `${config.IMAGE.USER_FILE_URL_PATH}/${studentData.signature}`;
        return res.status(200).json({ 'status': true, 'result': studentData });
    } catch (err) {
        console.log(err, '--errr')
        return res.status(500).json({ 'status': false });
    }
}
const updateStudent = async (req, res) => {
    try {
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const surName = req.body.surName;
        let FullName = `${firstName} ${lastName}`;
        if (surName !== undefined && surName !== "") {
            FullName += ` ${surName}`;
        }
        const Feesdeclare = await FeeSetup.findOne({ admissiongrade: req.body.admissiongrade }, { totalfees: 1 }).lean()
        const FeesAmount = Feesdeclare.totalfees;
        let updateDoc = {
            'name': FullName,
            'dob': req.body.dob,
            'age': req.body.age,
            'email': req.body.email,
            'emergencycontactNumber': req.body.emergencycontactNumber,
            'contactNumber': req.body.contactNumber,
            'whatsappNumber': req.body.whatsappNumber,
            'vaccination': req.body.vaccination,
            'placeofbirth': req.body.placeofbirth,
            'aadhaarNumber': req.body.aadhaarNumber,
            'permanentaddress': req.body.permanentaddress,
            'temporaryaddress': req.body.temporaryaddress,
            'bloodgroup': req.body.bloodgroup,
            'admissiongrade': req.body.admissiongrade,
            'previousgrade': req.body.previousgrade,
            'previousschoolhistory': req.body.previousschoolhistory,
            'emergencyrelationname': req.body.emergencyrelationname,
            'fathername': req.body.fathername,
            'mothername': req.body.mothername,
            'fatherphonenumber': req.body.fatherphonenumber,
            'motherphonenumber': req.body.motherphonenumber,
            'feesamount': FeesAmount
        }
        if (!isEmpty(req.files) && req.files.photo && req.files.photo.length > 0) {
            updateDoc.photo = req.files.photo[0].filename;
        }
        if (!isEmpty(req.files) && req.files.signature && req.files.signature.length > 0) {
            updateDoc.signature = req.files.signature[0].filename;
        }
        let userData = await Admission.findOneAndUpdate({ _id: req.body.Id }, { '$set': updateDoc }, { new: true });
        return res.status(200).json({ 'status': true, 'message': "Data Updated successfully" })
    } catch (err) {
        return res.status(500).json({ 'status': false, 'message': 'error on server' })
    }
}
const createFeeSetup = async (req, res) => {
    try {
        //calculate total fees per gradewise
        const term1 = parseInt(req.body.term1, 10);
        const term2 = parseInt(req.body.term2, 10);
        const term3 = parseInt(req.body.term3, 10);
        const totalfees = term1 + term2 + term3;
        let newDocument = new FeeSetup({
            'admissiongrade': req.body.admissiongrade,
            'term1': req.body.term1,
            'term2': req.body.term2,
            'term3': req.body.term3,
            'totalfees': totalfees
        })
        await newDocument.save();
        return res.status(200).json({ 'status': true, 'message': 'Feesetup saved successfully' })
    } catch (err) {
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const updateFeeSetup = async (req, res) => {
    try {
        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.getMonth() + 1; // Months are zero-based, so add 1
        const year = currentDate.getFullYear();
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();
        const seconds = currentDate.getSeconds();
        // Create a formatted string
        const formattedDate = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        const term1 = parseInt(req.body.term1, 10);
        const term2 = parseInt(req.body.term2, 10);
        const term3 = parseInt(req.body.term3, 10);
        const totalfees = term1 + term2 + term3;
        let newDocument = {
            'admissiongrade': req.body.admissiongrade,
            'term1': req.body.term1,
            'term2': req.body.term2,
            'term3': req.body.term3,
            'updateddate': formattedDate,
            'totalfees': totalfees
        }
        let userData = await FeeSetup.findOneAndUpdate({ _id: req.body.Id }, { '$set': newDocument }, { new: true });
        return res.status(200).json({ 'status': true, 'message': 'Feesetup Updated Successfully' })
    } catch (err) {
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const getSingleFees = async (req, res) => {
    try {
        let feesData = await FeeSetup.findOne({ _id: req.params.id }).lean();
        return res.status(200).json({ 'status': true, 'result': feesData });
    } catch (err) {
        return res.status(500).json({ 'status': false });
    }
}
const findFeeSetup = async (req, res) => {
    try {
        let newDocument = await FeeSetup.find({}).lean();
        return res.status(200).json({ 'status': true, 'result': newDocument })
    } catch (err) {
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const createFeeCollection = async (req, res) => {
    try {
        // Retrieve the FeeSetup document for the selected grade
        const feeSetup = await FeeSetup.findOne({ admissiongrade: req.body.admissiongrade });
        if (!feeSetup) {
            return res.status(400).json({ status: false, message: 'Fee setup not found for the selected grade' });
        }
        // Get the selected terms from the request
        const selectedTerms = req.body.paymentterm; // Use the selected terms from the request

        // Calculate the due amount based on the selected terms
        let totalDueAmount = 0;

        selectedTerms.forEach((term) => {
            if (term in feeSetup) {
                totalDueAmount += feeSetup[term];
            }
        });

        // Create the fee collection document with the calculated due amount
        const newDocument = new FeeCollection({
            name: req.body.name,
            studentId: req.body.studentId,
            dueamount: totalDueAmount,
            paymentterm: selectedTerms, // Use the selected terms
            admissiongrade: req.body.admissiongrade,
        });

        await newDocument.save();
        return res.status(200).json({ status: true, message: 'Choose payment type, Proceed to payment', result: newDocument });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ status: false, message: 'Error on the server' });
    }
};

const feesPaid = async (req, res) => {
    try {
        const balanceamount = (parseFloat(req.body.total) - parseFloat(req.body.amountpaid)).toFixed(2)
        const newDocument = new FeesPaid({
            name: req.body.name,
            studentId: req.body.studentId,
            dueamount: req.body.dueamount,
            total: req.body.total,
            amountpaid: req.body.amountpaid,
            balanceamount: balanceamount,
        });
        await newDocument.save();
        return res.status(200).json({ 'status': true, 'message': 'Amount Paid successfully' });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const verifysingleSection = async (req, res) => {
    try {
        const result = await GroupSection.findOne({ 'students.studentId': req.body.students.studentId }).lean();
        return res.status(200).json({ 'status': true, 'result': result });
    } catch (err) {
        console.log(err, '---err');
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const singlesectionAllocation = async (req, res) => {
    try {
        const existingDocument = await GroupSection.findOne({ 'section': req.body.section, 'admissiongrade': req.body.admissiongrade });
        if (existingDocument) {
            existingDocument.students.push({
                'name': req.body.students.name,
                'studentId': req.body.students.studentId,
            });
            const updatedDocument = await existingDocument.save();
            return res.status(200).json({ 'status': true, 'message': 'Section Allocated Successfully' });
        } else {
            const newDocument = new GroupSection({
                section: req.body.section,
                admissiongrade: req.body.admissiongrade,
                students: req.body.students,
            });
            await newDocument.save();
            return res.status(200).json({ 'status': true, 'message': 'Section Allocated Successfully' });
        }
    } catch (err) {
        console.log(err, '---err')
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const updatesingleSection = async (req, res) => {
    try {
        const { admissiongrade, section, students } = req.body;
        const newSection = await GroupSection.findOne({ admissiongrade, section });
        if (newSection) {
            const updatedList = newSection.students.filter(item => item.studentId !== students.studentId)
            newSection.students = updatedList;
            const newUpdate = await newSection.save();
        }
        return res.status(200).json({ 'status': true, 'message': 'Student Removed Successfully', });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: 'Error on the server' });
    }
};
const groupsectionallocate = async (req, res) => {
    try {
        const existingDocument = await GroupSection.findOne({ 'students.studentId': req.body.students[0].studentId });
        if (existingDocument) {
            // If the student already exists, update the section
            const updatedDocument = await GroupSection.findOneAndUpdate(
                { 'students.studentId': req.body.students[0].studentId },
                { $set: { section: req.body.section } },
                { new: true } // To return the updated document
            );
            return res.status(200).json({ 'status': true, 'message': 'Section Changed Successfully' });
        }
        const newDocument = new GroupSection({
            section: req.body.section,
            admissiongrade: req.body.admissiongrade,
            students: req.body.students,
        });
        await newDocument.save();
        return res.status(200).json({ 'status': true, 'message': 'Section Allocated Successfully' });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const verifyGroupSection = async (req, res) => {
    try {
        const result = await GroupSection.findOne({ 'students.studentId': req.body.students[0].studentId }, { section: 1 }).lean()
        return res.status(200).json({ 'status': true, 'result': result });
    } catch (err) {
        console.log(err, '---err')
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const createteacherSchedule = async (req, res) => {
    try {
        const existingSchedule = await Schedule.findOne({ teacherId: req.body.teacherId });
        if (existingSchedule) {
            // If a schedule with the teacherId already exists, update the schedule field
            existingSchedule.schedule = req.body.schedule;
            await existingSchedule.save();
            return res.status(200).json({ 'status': true, "message": "Schedule updated successfully" });
        } else {
            // If no schedule with the teacherId exists, create a new schedule
            const newSchedule = new Schedule({
                "teacherName": req.body.teacherName,
                "teacherId": req.body.teacherId,
                "schedule": req.body.schedule,
            });
            await newSchedule.save();
            return res.status(200).json({ 'status': true, "message": "Schedule fixed successfully" });
        }
    } catch (err) {
        console.log(err, '--err');
        return res.status(500).json({ 'status': false, 'message': "Error on the Server" });
    }
};
const findteacherSchedule = async (req, res) => {
    try {
        const findTeacher = await TeacherAdmission.findOne({ 'teacherId': req.params.teacherId }, { _id: 1 }).lean();
        const findresult = await Schedule.findOne({ 'teacherId': req.params.teacherId }).lean();

        if (findresult) {
            return res.status(200).json({ 'status': true, "result": findresult, 'result2': findTeacher });
        } else {
            // If findresult is null, return response with only findTeacher
            return res.status(200).json({ 'status': true, 'result2': findTeacher });
        }
    } catch (err) {
        console.log(err, '--err');
        return res.status(500).json({ 'status': false, 'message': "Error on the Server" });
    }
};
const findFixedSchedule = async (req, res) => {
    try {
        const { teacherId } = req.query; // Access query parameters
        // Now you can use teacherId to find the fixed schedule
        const findresult = await Schedule.findOne({ 'teacherId': teacherId }).lean();
        return res.status(200).json({ 'status': true, "result": findresult });
    } catch (err) {
        console.log(err, '--err');
        return res.status(500).json({ 'status': false, 'message': "Error on the Server" });
    }
};
const findScheduleforDetails = async (req, res) => {
    try {
        const { teacherId } = req.query;
        const findSchedule = await Schedule.findOne({ 'teacherId': teacherId }).lean();
        const findClass = await ClassAllocate.findOne({ 'teacherId': teacherId }).lean();
        return res.status(200).json({ 'status': true, 'result': findSchedule, 'result2': findClass })
    } catch (err) {
        console.log(err, '--err');
        return res.status(500).json({ 'status': false, 'message': "Error on the Server" });
    }
}
const feePayment = async (req, res) => {
    try {
        const result = await FeeCollection.findOne({ 'name': req.params.name }).lean();
        return res.status(200).json({ 'status': true, 'result': result });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const feestatus = async (req, res) => {
    try {
        const result = await FeesPaid.findOne({ 'studentId': req.body.studentId }).lean();
        return res.status(200).json({ 'status': true, 'result': result });
    } catch (err) {
        return res.status(500).json({ 'status': false, 'message': 'Error on the server' });
    }
}
const registerTeacher = async (req, res) => {
    const maxTeacher = await TeacherAdmission.findOne({}, { teacherId: 1 }).sort({ teacherId: -1 });
    let nextTeacherId = 'T0001';
    //fix TeacherId for each one
    if (maxTeacher && maxTeacher.teacherId) {
        const currentMaxId = maxTeacher.teacherId;
        const seriesNumber = parseInt(currentMaxId.substring(1), 10) + 1;
        nextTeacherId = `T${seriesNumber.toString().padStart(4, '0')}`;
    }
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    let FullName = `${firstName} ${lastName}`;
    let newDoc = new TeacherAdmission({
        'teacherId': nextTeacherId,
        'name': FullName,
        'dob': req.body.dob,
        'age': req.body.age,
        'teachingexperience': req.body.teachingexperience,
        'email': req.body.email,
        'teacherphoto': req.files.teacherphoto[0].filename,
        'emergencycontactNumber': req.body.emergencycontactNumber,
        'phoneNumber': req.body.phoneNumber,
        'whatsappNumber': req.body.whatsappNumber,
        'teachersignature': req.files.teachersignature[0].filename,
        'vaccination': req.body.vaccination,
        'placeofbirth': req.body.placeofbirth,
        'aadhaarNumber': req.body.aadhaarNumber,
        'permanentaddress': req.body.permanentaddress,
        'temporaryaddress': req.body.temporaryaddress,
        'bloodgroup': req.body.bloodgroup,
        'higherqualification': req.body.higherqualification,
        'maritalstatus': req.body.maritalstatus,
        'teachingcertificates': req.body.teachingcertificates,
        'subjects': req.body.subjects,
        'fatherphonenumber': req.body.fatherphonenumber,
        'motherphonenumber': req.body.motherphonenumber,
        'currentsalary': req.body.currentsalary,
    })
    await newDoc.save();
    return res.status(200).json({ 'status': true, 'message': " Register successfully" })
}
const teacheraadhaarValid = async (req, res) => {
    try {
        let checkaadhaarNo = await TeacherAdmission.find({}, { 'aadhaarNumber': 1 }).lean();
        return res.status(200).json({ 'status': true, result: checkaadhaarNo })
    } catch (err) {
        console.log(err, '---err')
        return res.status(500).json({ 'status': false, 'message': 'Error on server' })
    }
}
const ViewTeacher = async (req, res) => {
    try {
        const teacherView = await TeacherAdmission.find({}).lean();
        const sectionView = await ClassAllocate.find({}).lean();
        return res.status(200).json({ 'status': true, 'result': teacherView, 'result2': sectionView, 'imageUrl': config.IMAGE.TEACHER_FILE_URL_PATH })
    } catch (err) {
        console.log(err, '---err')
        return res.status(500).json({ 'status': false, 'message': 'Error on server' })
    }
}

const deleteTeacher = async (req, res) => {
    if (isEmpty(req.params.id)) {
        return res.status(400).json({ 'status': false, 'message': '_Id is empty' });
    }
    try {
        const filter = { _id: req.params.id };
        const update = { active: '0' }; // You can set the new status here
        const updatedData = await TeacherAdmission.updateOne(filter, { $set: update });
        if (updatedData && updatedData.modifiedCount > 0) {
            return res.status(200).json({ 'status': true, 'message': ' Data Deleted successfully' });
        } else {
            return res.status(200).json({ 'status': true, 'message': 'No matching records found' });
        }
    } catch (error) {
        console.log(error, '--errr')
        return res.status(500).json({ 'status': false, 'message': 'Internal Server Error' });
    }
}
const updateTeacher = async (req, res) => {
    try {
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        let FullName = `${firstName} ${lastName}`;
        let updateDoc = ({
            'name': FullName,
            'dob': req.body.dob,
            'age': req.body.age,
            'teachingexperience': req.body.teachingexperience,
            'email': req.body.email,
            'emergencycontactNumber': req.body.emergencycontactNumber,
            'phoneNumber': req.body.phoneNumber,
            'whatsappNumber': req.body.whatsappNumber,
            'vaccination': req.body.vaccination,
            'placeofbirth': req.body.placeofbirth,
            'aadhaarNumber': req.body.aadhaarNumber,
            'permanentaddress': req.body.permanentaddress,
            'temporaryaddress': req.body.temporaryaddress,
            'bloodgroup': req.body.bloodgroup,
            'higherqualification': req.body.higherqualification,
            'maritalstatus': req.body.maritalstatus,
            'teachingcertificates': req.body.teachingcertificates,
            'subjects': req.body.subjects,
            'fatherphonenumber': req.body.fatherphonenumber,
            'motherphonenumber': req.body.motherphonenumber,
            'currentsalary': req.body.currentsalary,
        })

        if (!isEmpty(req.files) && req.files.teacherphoto && req.files.teacherphoto.length > 0) {
            updateDoc.teacherphoto = req.files.teacherphoto[0].filename;
        }
        if (!isEmpty(req.files) && req.files.teachersignature && req.files.teachersignature.length > 0) {
            updateDoc.teachersignature = req.files.teachersignature[0].filename;
        }
        let userData = await TeacherAdmission.findOneAndUpdate({ _id: req.body.Id }, { '$set': updateDoc }, { new: true });
        return res.status(200).json({ 'status': true, 'message': "Data Updated successfully" })
    } catch (err) {
        console.log(err, '--err')
        return res.status(500).json({ 'status': false, 'message': 'error on server' })
    }
}
const getSingleTeacher = async (req, res) => {
    try {
        let teacherData = await TeacherAdmission.findOne({ _id: req.params.id }).lean();
        const [firstName, ...lastName] = teacherData.name.split(" ");
        const LastName = lastName.join(" ");
        teacherData.firstName = firstName;
        teacherData.lastName = LastName;
        // Add the image URLs
        teacherData.teacherphoto = `${config.IMAGE.TEACHER_FILE_URL_PATH}/${teacherData.teacherphoto}`;
        teacherData.teachersignature = `${config.IMAGE.TEACHER_FILE_URL_PATH}/${teacherData.teachersignature}`;
        return res.status(200).json({ 'status': true, 'result': teacherData });
    } catch (err) {
        console.log(err, '--err')
        return res.status(500).json({ 'status': false, 'message': 'error on server' })
    }
}
const teacherclassAllocate = async (req, res) => {
    try {
        const updateClass = await ClassAllocate.findOne({ name: req.body.name, teacherId: req.body.teacherId });
        if (updateClass) {
           const ans = await ClassAllocate.updateOne({ name: req.body.name, teacherId: req.body.teacherId },{'$set':{status:req.body.status}})
            return res.status(200).json({ 'status': true, 'message': 'Class Updated Successfully' });
        } else {
            const newDocument = new ClassAllocate({
                name: req.body.name,
                teacherId: req.body.teacherId,
                status: req.body.status,
            });
            await newDocument.save();
            return res.status(200).json({ 'status': true, 'message': 'Class Allocated Successfully' });
        }
    } catch (err) {
        console.log(err, '--err')
        return res.status(500).json({ 'status': false, 'message': 'Error On Server' })
    }
}
const findTeacherClass = async (req,res) =>{
    try{
     const findClass = await ClassAllocate.findOne({'teacherId':req.query.teacherId}).lean()
     return res.status(200).json({'status':true,'result':findClass})
    }catch(err){
        console.log(err,'---err')
        return res.status(500).json({'status':false,'message':'Error On Server'})
    }
}
const findTeacherWholeClass = async (req,res) =>{
    try{
     const findWholeClass = await ClassAllocate.find({}).lean()
     return res.status(200).json({'status':true, 'result':findWholeClass})
    }catch(err){
        console.log(err,'---err')
        return res.status(500).json({'status':false,'message':'Error On Server'})
    }
}
const teacherAttendanceSetup = async (req, res) => {
    try {
        const Getmonth =new Date();
        const Month =Getmonth.toLocaleString('en-US', { month: 'long' })
        const Day = Getmonth.toLocaleString('en-US', { weekday: 'long' });
            const newDocument = new TeacherAttendance({
                date:req.body.date,
                month:Month,
                day:Day,
                attendance: req.body.attendance,
            });
            await newDocument.save();
            return res.status(200).json({ 'status': true, 'message': 'Attendance Updated Successfully' });
    } catch (err) {
        console.log(err, '--err')
        return res.status(500).json({ 'status': false, 'message': 'Error On Server' })
    }
}
const getAttendance = async(req,res) => {
    try{
       const getData = await TeacherAttendance.findOne({date:req.query.date}).lean()
       return res.status(200).json({ 'status': true, 'result':getData})
    }catch{
        console.log(err, '--err')
        return res.status(500).json({ 'status': false, 'message': 'Error On Server' })
    }
}
const getAttendanceforMonth =async(req,res)=>{
    try{
        const getData = await TeacherAttendance.find({month:req.query.month}).lean()
        return res.status(200).json({ 'status': true, 'result':getData})
    }catch{
        console.log(err, '--err')
        return res.status(500).json({ 'status': false, 'message': 'Error On Server' })
    }
}
module.exports = {
    adminLogin,
    verifyCode,
    jwtSign,
    jwtVerify,
    registerStudent,
    createadmin,
    ReverifyCode,
    viewStudent,
    getSingleStudent,
    updateStudent,
    createFeeSetup,
    createFeeCollection,
    findFeeSetup,
    feePayment,
    feesPaid,
    verifysingleSection,
    registerTeacher,
    ViewTeacher,
    deleteTeacher,
    updateTeacher,
    getSingleTeacher,
    teacheraadhaarValid,
    studentaadhaarValid,
    deleteStudent,
    updateFeeSetup,
    getSingleFees,
    feestatus,
    createteacherSchedule,
    findteacherSchedule,
    findFixedSchedule,
    groupsectionallocate,
    verifyGroupSection,
    singlesectionAllocation,
    updatesingleSection,
    findScheduleforDetails,
    teacherclassAllocate,
    findTeacherClass,
    teacherAttendanceSetup,
    getAttendance,
    getAttendanceforMonth,
    findTeacherWholeClass
};