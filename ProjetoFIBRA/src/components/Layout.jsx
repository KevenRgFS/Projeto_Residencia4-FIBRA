import { Aside } from "./Aside"
import { Header } from "./Header"
import {Outlet} from "react-router-dom"

export function Layout(){

    return(

        <div className="layout">

            <Aside />
            <main className="main">
                <Header/>
                <div className="content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}