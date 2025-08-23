
import React from "react";
import Navbar from "./Navbar";

export default function Layout({children, title}){
  return (
    <>
      <Navbar/>
      <main className="container">
        {title ? <h1 style={{letterSpacing:".2px"}}>{title}</h1> : null}
        {children}
      </main>
    </>
  )
}
