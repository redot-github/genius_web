import React from 'react'

const UpiPay = () => {
    return(
      <>
        <form action="" className="pay-form">
            <div className="upi-content">
            <img src={`${process.env.PUBLIC_URL}/images/UPI.png`} alt='' />
            <p>
                Scan the QR CODE using your preferred UPI app to Complete the
                payment
            </p>
            <img src={`${process.env.PUBLIC_URL}/images/QR.png`} alt=''/>
            </div>
        </form>
      </>
    )
}
 export default UpiPay;
