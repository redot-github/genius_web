import React from 'react'
import { NavLink,useLocation,useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOut } from '@fortawesome/free-solid-svg-icons';
import { removeAuthToken } from '../../lib/localstorage';

const Sidebar = () => {
  const navigate = useNavigate()
  const { pathname } =useLocation()
  const isLinkActive = (linkPath) => {
    return pathname === linkPath;
  };
  return (
    <div className="side-bar">
      <div className="part-one">
        <div className="logo-content">
          <div className="logo">
            <img src="images/Polygon 3.png" />
            <span>Genius</span>
          </div>
        </div>
        <ul>
          <li>
          <div className="menu-bar" style={isLinkActive('/newadmission') ? 
  { 
    background: 'linear-gradient(to right, #dad8ff, #f3f1ff)',
    width: '100%',
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } : null}
>
  <img src="images/grey-file.png" />
  <NavLink to='/newadmission' className="mysidebar">NewAdmission</NavLink>
</div>

          </li>
          <li>
          <div className="menu-bar" style={isLinkActive('/students') ?  { background: 'linear-gradient(to right,#dad8ff,#f3f1ff)' , width: '100%',
    height:'45px',display:'flex',alignItems:'center',justifyContent:'center'} : null}>
              <img src="images/person.png" alt=""/>
             <NavLink to='/students'  className="mysidebar">Students</NavLink>
            </div>
          </li>
          <li>
            <div className="menu-bar">
              <img src="images/fee.png" alt="" />
              Fee Collection
            </div>
          </li>
          <li>
            <div className="menu-bar">
              <img src="images/setup.png" alt="" />
              Fee Setup
            </div>
          </li>
        </ul>
      </div>
      <div className="part-two">
        <img src="images/Profile photo.png" alt="" />
        <div>
          <span>Sam Smith</span>
          <br />
          <span style={{ color: "#ccc" }}>Admin</span>
        </div>
        <button  data-bs-toggle="tooltip" title="Logout!"  data-bs-placement="right" className='adminlogout' onClick={()=> {removeAuthToken();navigate('/login')}}><FontAwesomeIcon icon={faSignOut} /></button>
      </div>
    </div>
  )
}

export default Sidebar;