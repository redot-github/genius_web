import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
//import components
import Sidebar from './components/sidebar';
import Navbar from './components/navbar';
//import actions
import { Sectionallocation, Verifysinglesection, getSinglestudent, updatesinglesection } from '../actions/adminAction';
//import lib
import toastAlert from '../lib/toast';

const initialFormValue = {
  name: '',
  studentId: '',
  admissiongrade: '',
  section:''
}

const SectionAllocation = () => {
  // hooks
  const navigate = useNavigate();
  // state
  const [formValue, setFormValue] = useState(initialFormValue);
  const [NameId,setNameId] = useState({});
  const [errors, setErrors] = useState({});
  const [inputErrors, setInputErrors] = useState({});
  const [data,setData] = useState(null)
  //params
  const { Id } = useParams();

  const { name, studentId, admissiongrade, section } = formValue;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputErrors((prevErrors) => ({
      ...prevErrors,
      [name]: undefined, 
    }));
    setFormValue({ ...formValue, ...{ [name]: value } })
  }
  const students = {
    name:name,
    studentId:studentId
  }
  const getData = async (id) => {
    try {
      let { status, result } = await getSinglestudent(id);
      if (status === true) {
        setFormValue(prevFormValue => ({...prevFormValue, ...result}));
        setNameId(result)
      }
    } catch (err) {
      console.log(err, '--err');
    }
  }
  useEffect(() => {
    getData(Id)
  }, [])

  const getSection = async () =>{
    try{
      let Sectiondata = {
         students :{...students}
      }
     let {status,result} = await Verifysinglesection(Sectiondata)
     if (status === true && result !== null) {
      setFormValue(result);
      setData(result)
    }
  } catch (err) {
    console.log(err, '--err');
  }
  }
  useEffect(() => {
    getSection()
  }, [students])

  const handleRemove = async () => {
    try{
      console.log(formValue,'---value')
      let Updatedata = {
        students : {
          name:NameId.name,
          studentId:NameId.studentId
        },
        section: section,
        admissiongrade:NameId.admissiongrade,
      }
      let { status, message } = await updatesinglesection(Updatedata)
      if (status === true) {
        setFormValue({})
        setData(null)
        toastAlert('success',message)
      } 
    }catch(err){
      console.log(err,'---err')
    }
  }
 
  const handleSubmit = async () => {
    try {

      let data = {
        students: {
          name:NameId.name,
          studentId:NameId.studentId
        },
        section: section,
        admissiongrade: NameId.admissiongrade,
      }
      let { status, message, errors } = await Sectionallocation(data)
      if (status === true) {
        setFormValue(initialFormValue)
        toastAlert('success', message)
        setErrors({})
        navigate(`/students`);
      } 
      if (status === false) {
        if (errors) {
          setErrors(errors);
          // Update the inputErrors state for each input with an error
          setInputErrors((prevErrors) => ({
            ...prevErrors,
            section:errors.section,
          }));
        }
        if (message) {
          toastAlert('error', message);
        }
      }
      
    } catch (err) {
      console.log(err, '...err')
    }
  }
  
  return (
    <div className="fee-collection">
      <Sidebar Id={Id} />
      <div className="fee-content">
        <Navbar pageTitle={'Section Allotment'} />
        <div className="fee-form">
          <div className="fee-form-header">
            <span>Student Section Allotment</span>
          </div>
          <form action="" className="fee">
            <div className="fee-form-content">
              <div className="fee-left">
                <div className="fee-box">
                  <label>
                    Name
                  </label>
                  <input type="text" name="name" value={name} onChange={handleChange}  />
                  <span className='text-error'>{inputErrors.name}</span>
                </div>
                <div className="fee-box">
                  <label htmlFor="">
                    Grade
                  </label>
                  <input type="text" name="admissiongrade" value={admissiongrade} onChange={handleChange}  />
                  <span className='text-error'>{inputErrors.admissiongrade}</span>
                </div>
              </div>
              <div className="fee-right">
                <div className="fee-box">
                  <label>Student ID</label>
                  <input type="text" name="studentId" value={studentId} onChange={handleChange}  />
                  <span className='text-error'>{inputErrors.studentId}</span>
                </div>
                <div className="fee-box">
  <label>Section</label>
  <select name="section" value={section} onChange={handleChange}>
  {data && data.section ? (
      <>
        <option>A</option>
        <option>B</option>
        <option>C</option>
        <option>D</option>
        <option>E</option>
        <option>F</option>
        <option>G</option>
      </>
    ) : (
      <>
        <option value=''>Select section</option>
        <option>A</option>
        <option>B</option>
        <option>C</option>
        <option>D</option>
        <option>E</option>
        <option>F</option>
        <option>G</option>
      </>
    )}
  </select>
  {/* Render an error message if getSection has data */}
  {data && data.section ? ( (data.section === section) ? 
  (<span className='text-error'>❌Section already allocated</span>):
  (<span style={{color:"green",fontSize:"11px", fontWeight:"500"}}>
✅Section Changed</span>)):(<span className='text-error'>{inputErrors.section}</span>)}
</div>
             {data && data.section ? ((data.section === section) ?(<button type="button" className='removebutton' onClick={handleRemove}>Remove Section</button>):(null)):(null)} 
              </div>
            </div>
            <div className="process-btn">
              <button type="button" onClick={handleSubmit}>Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SectionAllocation;