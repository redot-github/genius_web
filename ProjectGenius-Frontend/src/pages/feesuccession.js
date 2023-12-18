import React from 'react'
import Sidebar from './components/sidebar';
import { useNavigate } from 'react-router-dom';


const FeeComplete = () => {
  const navigate = useNavigate();
    return (
<div className="fee-collection">
  <Sidebar />
  <div className="payment-success">
    <div className="success">
      <p style={{ fontSize: 13 }}>Thank You For Your Payment</p>
      <img src="images/tik.png" />
      <span>Payment #123RGR231567Y Successful</span>
      <button type="button" className="receipt" onClick={navigate('/students')}>
        Generate Receipt
      </button>
    </div>
  </div>
</div>

    )
}

export default FeeComplete;