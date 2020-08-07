import React, {useEffect} from "react";

import SearchIcon from '@material-ui/icons/Search';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MenuItem from '@material-ui/core/MenuItem';
import {Menu, Grid} from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';
import MoreIcon from '@material-ui/icons/MoreVert';
import Cookies from 'js-cookie';
import {
    getDataViaAPI, setAuthDetailsFromCookie,
    signOut, signOutUsingOAuth
} from '../../../actions';
import {connect, useDispatch} from 'react-redux'

import {
    AppBar, Toolbar, IconButton, Typography
} from '@material-ui/core';

import useNavBarStyles from "../../../styles/materialUI/navBarStyles";
import TabList from "./tabList";
import {Link} from "react-router-dom";
import {useSelector} from "react-redux";
import {ADD_TO_CART, LOAD_TABS_DATA, SET_GOOGLE_AUTH} from "../../../actions/types";
import log from "loglevel";
import Hidden from "@material-ui/core/Hidden";
import BagButton from "./bagButton";
import {tabsDataReducer} from "../../../reducers/screens/commonScreenReducer";
import {HTTPError} from "../../ui/error/httpError";
import {BadRequest} from "../../ui/error/badRequest";
import SearchBar from "./searchBar";
import SideBar from "./sideBar";
import {SHOPPERS_PRODUCT_INFO_COOKIE, AUTH_DETAILS_COOKIE} from "../../../constants/cookies";
import {TABS_DATA_API} from "../../../constants/api_routes";
import {TABS_API_OBJECT_LEN} from "../../../constants/constants"
import Avatar from '@material-ui/core/Avatar';
import history from "../../../history";

const NavBar = props => {
    const classes = useNavBarStyles();

    const [mobileSearchState, setMobileSearchState] = React.useState(false);
    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState(null);
    const [hamburgerBtnState, setHamburgerBtnState] = React.useState(false);

    const {isSignedIn, tokenId, firstName} = useSelector(state => state.signInReducer)
    const googleAuthReducer = useSelector(state => state.googleAuthReducer)
    const tabsAPIData = useSelector(state => state.tabsDataReducer)

    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);
    const dispatch = useDispatch()

    let authIcon = null
    let authLabel = null

    /**
     * set the cart from saved Cookie
     */
    const setAddToCartValuesFromCookie = () => {
        let savedProductsFromCookie = Cookies.get(SHOPPERS_PRODUCT_INFO_COOKIE)
        let totalQuantity = 0
        if (savedProductsFromCookie) {
            savedProductsFromCookie = JSON.parse(savedProductsFromCookie)

            for (const [, qty] of Object.entries(savedProductsFromCookie.productQty)) {
                totalQuantity += parseInt(qty)
            }
            savedProductsFromCookie.totalQuantity = totalQuantity

            log.info(`[BagButton] savedProductsFromCookie = ${JSON.stringify(savedProductsFromCookie)}`)

            dispatch({
                type: ADD_TO_CART,
                payload: savedProductsFromCookie
            })
        }
    }

    /**
     * This will execute only once.
     */
    useEffect(() => {
        log.info(`[NavBar]: Component did update.`)

        if (!googleAuthReducer.oAuth) {
            try {
                window.gapi.load('client:auth2', () => {
                    window.gapi.client.init({
                        clientId: process.env.REACT_APP_GOOGLE_AUTH_CLIENT_ID,
                        scope: 'profile'
                    }).then(() => {
                        const auth = window.gapi.auth2.getAuthInstance();
                        dispatch({
                            type: SET_GOOGLE_AUTH,
                            payload: {
                                firstName: auth.currentUser.get().getBasicProfile() ?
                                    auth.currentUser.get().getBasicProfile().getGivenName() : null,
                                oAuth: auth
                            }
                        })
                    });
                });
            } catch (e) {
                log.info(`[Navbar] Failed to load google OAuth.`)
            }
        }

        if (isSignedIn === null) {
            // if user is not signed in then signed it in using
            // account details from the cookie.

            log.info(`[NavBar]: isSignedIn is null`)
            let savedAuthDetails = Cookies.get(AUTH_DETAILS_COOKIE)
            if (savedAuthDetails) {
                log.info(`[NavBar]: setting Auth Details from Cookie`)
                props.setAuthDetailsFromCookie(JSON.parse(savedAuthDetails))
            }
        }

        // tabs data is not loaded then load it.
        if (!tabsAPIData.hasOwnProperty("data")) {
            props.getDataViaAPI(LOAD_TABS_DATA, TABS_DATA_API)
        }

        // set the cart values
        setAddToCartValuesFromCookie()

        // eslint-disable-next-line
    }, [isSignedIn, tabsDataReducer]);

    if (tabsAPIData.isLoading) {
        log.info("[NavBar]: loading")
        return null
    } else {
        if (tabsAPIData.hasOwnProperty("data")) {
            if (Object.entries(tabsAPIData.data).length !== TABS_API_OBJECT_LEN) {

                log.info(`[NavBar]: tabsAPIData.data length didn't matched` +
                    `actual length = ${Object.entries(tabsAPIData.data).length},` +
                    `expected length = ${TABS_API_OBJECT_LEN}`)

                return <BadRequest/>
            }
        } else {
            if (tabsAPIData.hasOwnProperty("statusCode")) {
                log.info(`[NavBar]: tabsAPIData.statusCode = ${tabsAPIData.statusCode}`)
                props.errorHandler()
                return <HTTPError statusCode={tabsAPIData.statusCode}/>
            }
        }
    }

    if (isSignedIn || googleAuthReducer.isSignedInUsingOAuth) {
        let fName
        if (firstName) {
            fName = firstName
        } else if (googleAuthReducer.isSignedInUsingOAuth) {
            fName = googleAuthReducer.firstName
        } else {
            fName = "S"
        }

        authIcon = <Avatar className={classes.orange} sizes="small"
                           style={{width: 20, height: 20, marginBottom: 3}}>
                            {fName.charAt(0).toUpperCase()}
                    </Avatar>
        authLabel = "Sign Out"
    } else {
        authIcon = <AccountCircle/>
        authLabel = "Sign In"
    }

    const handleMobileMenuClose = () => {
        setMobileMoreAnchorEl(null);
    };

    const handleMobileMenuOpen = (event) => {
        setMobileMoreAnchorEl(event.currentTarget);
    };

    const changeAuthStatusHandler = () => {
        log.info(`[Navbar] handleSignOutClick isSignedIn = ${googleAuthReducer.isSignedInUsingOAuth}`)
        if (googleAuthReducer.isSignedInUsingOAuth) {
            props.signOutUsingOAuth(googleAuthReducer.oAuth)
        } else if (tokenId && isSignedIn) {
            props.signOut()
        } else {
            history.push("/signin")
        }

        handleMobileMenuClose();
    }

    const changePageToShoppingBagHandler = () => {
        history.push("/shopping-bag")
        setMobileMoreAnchorEl(null);
    }

    const mobileMenuId = 'primary-search-account-menu-mobile';
    const renderMobileMenu = (
        <Menu
            anchorEl={mobileMoreAnchorEl}
            anchorOrigin={{vertical: 'top', horizontal: 'right'}}
            id={mobileMenuId}
            keepMounted
            transformOrigin={{vertical: 'top', horizontal: 'right'}}
            open={isMobileMenuOpen}
            onClose={handleMobileMenuClose}>
            <MenuItem onClick={changeAuthStatusHandler} style={{padding: "0 0.7rem 0 0"}}>
                <Grid container alignItems="center">
                    <Grid item>
                        <IconButton aria-label="account of current user"
                                    aria-controls="primary-search-account-menu"
                                    aria-haspopup="true"
                                    color="inherit">
                            {authIcon}
                        </IconButton>
                    </Grid>
                    <Grid item>
                        <p>{authLabel}</p>
                    </Grid>
                </Grid>
            </MenuItem>
            <MenuItem onClick={changePageToShoppingBagHandler} style={{padding: "0 0.7rem 0 0"}}>
                <Grid container alignItems="center">
                    <Grid item xs={7}>
                        <IconButton color="inherit">
                            <BagButton/>
                        </IconButton>
                    </Grid>
                    <Grid item>
                        <p>Bag</p>
                    </Grid>
                </Grid>
            </MenuItem>
        </Menu>
    );

    const handleMobileSearchClose = () => {
        setMobileSearchState(false)
    }

    const renderMobileSearchInputField = () => {
        if (mobileSearchState) {
            return <SearchBar size="medium" handleClose={handleMobileSearchClose}/>
        }
    }

    const handleMobileSearchOpen = () => {
        setMobileSearchState(true)
    }

    const handleHamburgerBtnClick = () => {
        log.info(`[NavBar] opening sidebar`)
        setHamburgerBtnState(true)
    }

    const sidebarCloseHandler = () => {
        log.info(`[NavBar] clickAwayListener is triggered`)
        setHamburgerBtnState(false)
    }

    const renderIndependentElem = (eventHandler, icon, label) => {
        return (
            <Grid item>
                <Grid container direction="column" alignItems="center"
                      onClick={eventHandler} style={{cursor: 'pointer'}}>
                    <Grid item style={{height: 21, width: 21}}>
                        {icon}
                    </Grid>
                    <Grid item style={{color: "black", fontSize: "0.8rem", fontWeight: 'bold'}}>
                        {label}
                    </Grid>
                </Grid>
            </Grid>
        )
    }

    log.info(`[NavBar]: Rendering NavBar Component`)
    return (
        <>
            <SideBar open={hamburgerBtnState} closeHandler={sidebarCloseHandler}/>

            <div style={{paddingBottom: 80}}>
                <AppBar color="default" className={classes.appBarRoot}>
                    <Toolbar classes={{root: classes.toolBarRoot}}>
                        <Grid container alignItems="center">
                            <Hidden lgUp>
                                <Grid item>
                                    <IconButton
                                        edge="start"
                                        className={classes.menuButton}
                                        color="inherit"
                                        aria-label="open drawer"
                                        onClick={handleHamburgerBtnClick}>
                                        <MenuIcon fontSize="large"/>
                                    </IconButton>
                                </Grid>
                            </Hidden>

                            <Grid item>
                                <Link to="/">
                                    <Typography className={classes.title}>
                                        Shoppers
                                    </Typography>
                                </Link>
                            </Grid>

                            <div className={classes.growHalf}/>

                            <Hidden mdDown>
                                <Grid item xs={5}>
                                    <TabList/>
                                </Grid>

                                <div className={classes.growHalf}/>
                            </Hidden>

                            <Hidden xsDown>
                                <Grid item container sm={6} md={7} lg={4}>
                                    <SearchBar size="small"/>
                                </Grid>
                            </Hidden>

                            <Hidden smUp>
                                <Grid item container justify="flex-end" xs={5}>
                                    <IconButton onClick={handleMobileSearchOpen}
                                                edge="end">
                                        <SearchIcon fontSize="large"/>
                                    </IconButton>
                                </Grid>
                                {renderMobileSearchInputField()}
                            </Hidden>

                            <div className={classes.growHalf}/>

                            <Hidden xsDown>
                                {renderIndependentElem(changeAuthStatusHandler, authIcon, authLabel)}

                                <div className={classes.growQuarter}/>

                                {renderIndependentElem(changePageToShoppingBagHandler, <BagButton/>, "Bag")}
                            </Hidden>


                            <div className={classes.sectionMobile}>
                                <IconButton
                                    aria-label="show more"
                                    aria-controls={mobileMenuId}
                                    aria-haspopup="true"
                                    onClick={handleMobileMenuOpen}
                                    color="inherit"
                                    edge="end">
                                    <MoreIcon fontSize="large"/>
                                </IconButton>
                            </div>
                        </Grid>
                    </Toolbar>
                </AppBar>

                {renderMobileMenu}
            </div>
        </>
    );
};

export default connect(null, {setAuthDetailsFromCookie, signOut, signOutUsingOAuth, getDataViaAPI})(NavBar);