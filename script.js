// ==UserScript==
// @name         BitBucket search my branches
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       Me!
// @match        https://bitbucket.org/*
// @downloadURL  https://github.com/NerdyJ23/bitbucketbranchfilter/blob/main/script.js
// @updateURL    https://github.com/NerdyJ23/bitbucketbranchfilter/blob/main/script.js
// @icon         https://d301sr5gafysq2.cloudfront.net/frontbucket/assets/present/build-favicon-default.df3a1f57.ico
// @grant        none
// @run-at       document-end
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js

// ==/UserScript==
(function() {
    'use strict';
    let lastUrl = location.href;
    if(lastUrl.indexOf('/branches/') != -1)
    {
        console.log("on branch");
        setTimeout(function() {
            init();
        },1000);// need basic DOM to load, since bitbucket uses OnePAge application it needs time to load even with run at doc end
    }

    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            if(url.indexOf('/branches/') != -1)
            {
                console.log("on branch tree");
                setTimeout(function() {
                    init();
                },1000);
            }
            console.log(`new url is ${lastUrl}`);
        }
    }).observe(document, {subtree: true, childList: true});
})();

function init()
{
    addUI();
    addEvents();
    getUsersInWorkspace(0);
}

function addFilteredBranches(branchArr)
{
}

function getBranchByUser(user)
{
}

function getUsersInWorkspace(page) //no easy internal API for this one, gotta scour the HTML
{
    let url = `https://bitbucket.org/${getCurrentWorkspace()}/workspace/members/?page=${page+1}`

    let userArray = [];
    let memberPage = null;
    //let url = `https://api.bitbucket.org/2.0/workspaces/${getCurrentWorkspace()}/members`;
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState == 4 && this.status == 200) {

            memberPage= $(this.responseText);
            //console.log(memberPage);

            let memberCount = $(memberPage).find('#filter-pjax').find('p').text()//console.log(`found member count: ${$(memberPage).find('#filter-pjax').find('p').text()}`);
            memberCount = (memberCount.slice(memberCount.indexOf(':')+1, memberCount.length)).trim();
            console.log(`There are ${memberCount} users in this group`);

            let memberList = $(memberPage).find(".user");
            let i = memberCount / 30;
            console.log(`runs ${i} times`);
            let r = memberCount - (30 * page);
            console.log(`count: ${memberCount} | page: ${page} | remainder: ${r}`);
            console.log(r);
            if(r > 30)
            {
                r = 30;
                getUsersInWorkspace(page+1);
            }
            for(let user = 0; user < r; user++)
            {
                let currUser = $(memberList).find('span').text();
                console.log(currUser);
                console.log(`user ${user+1 + (30 * page)} of ${memberCount}`);
            }

        }
    }
    url = encodeURL(url);
    xhttp.open("GET", url);
    xhttp.send();
}
function addEvents()
{
    $(`#filter`).on("click",function() {
        branchPage(0);
    });
}
function branchPage(pageNo) //implicitly gets branch from the current branch url
{
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
        }
    }
    let url = `https://bitbucket.org/!api/internal/repositories/${getCurrentRepo()}/branch-list/`
    +`?q=name != \"master\" AND (ahead > 0 OR ahead = null)`
    +`&page=${pageNo}`
    +`&pagelen=25`
    +`&fields=`
    +`-values.target.author.user.account_id,`
    +`+values.pullrequest.state,`
    +`+values.pullrequest.created_on,`
    +`+values.pullrequests.state,`
    +`+values.pullrequests.created_on,`
    +`+values.pullrequests.closed_on,`
    +`-values.statuses,`
    +`+values.default_merge_strategy,`
    +`+values.merge_strategies`;

    url = encodeURL(url);
    xhttp.open("GET", url);
    xhttp.send();
}
function encodeURL(url)
{
    let encoded = url;
    encoded = encoded.replace(/([+])/g,'%2B');
    encoded = encoded.replace(/([,])/g,'%2C');

    return encoded;
}
function addUI()
{
    $('div[role="search"]').parent().parent().append(`
    <div id="userBranches" style="margin-top: 15px">
      <input type="button" id="filter" value="Filter" />
    </div>
    `);
}
function getCurrentRepo()
{
    let url = window.location.href;
    url = url.replace('https://',''); //bitbucket.org/WORKSPACE/REPO/branches
    console.log(url);

    url = url.slice(url.indexOf('/')+1, url.length-1); //WORKSPACE/REPO/branches
    console.log(url);
    url = url.replace(url.slice(url.lastIndexOf('/'),url.length),''); //WORKSPACE/REPO
    console.log(url);
    return url;
}
function getCurrentWorkspace()
{
    let url = getCurrentRepo(); //WORKSPACE/REPO
    url = url.slice(0, url.indexOf('/')); //WORKSPACE
    console.log(url);
    return url;
}