/**
 * Handles Resource Events when Interacting with the API
 */
function ResourceEvents(options) {
        this.updateEventName = options.updateEventName || 'update-from-api';
        this.updateEvent = function(){
            return this.createEvent(this.updateEventName);
        };
}
ResourceEvents.prototype =  {
        createEvent: function(name){
            var e = document.createEvent('Event');
            e.initEvent(name,true,true);
            return e;
        },
        hide: function(element){
            element.style.display = 'none';
        },
        show: function(element){
            element.style.display = 'block';
        },
        hideAllTags: function(tag){
            var elements = document.getElementsByTagName(tag);
            for(var i=0, elementLength=elements.length; i<elementLength; i++){
                this.hide(elements[i]);
            }
        },
        showOneHideOthers: function(element){
            this.hideAllTags(element.tagName);
            this.show(element);
        },
};
/**
 * Deals with getting and processing data for resource
 */
function Service (options) {
        this.request =  new XMLHttpRequest();
        this.requestMethod = options.requestMethod ||'GET';
}
Service.prototype = {
    dataToNode: function(element, parent, data){
        var toAppend = document.createElement(element);
        toAppend.innerHTML = data;
        return parent.appendChild(toAppend);
    },
    buildListItem: function(data, property, cssClass){
        var dataToNode = this.dataToNode,
            listItem = document.createElement('li'),
            header = document.createElement('header'),
            visitorCount = dataToNode('h1', header, data[property].stats.people),
            pageTitle = dataToNode('h1', header, data[property].title);

        visitorCount.className = app.cssClasses.visitorCount;
        listItem.appendChild(header);
        listItem.className = cssClass;
        return listItem;
    },
    buildAside: function(data, property){
        // get top referrers for each list item
        var toprefs = data[property].stats.toprefs,
            dataToNode = this.dataToNode,
            aside = document.createElement('aside'),
            header = document.createElement('header'),
            ul = document.createElement('ul');

        for(var _i=0, toprefsLength=toprefs.length; _i<toprefsLength; _i++){
            var referers = document.createElement('li'),
                visitorCount = dataToNode('span', referers, toprefs[_i].visitors);
            visitorCount.className = app.cssClasses.visitorCount;
            dataToNode('span', referers, toprefs[_i].domain);
            ul.appendChild(referers);
        }
        dataToNode('h1', header, data[property].title);
        dataToNode('h1', header, 'Top Referrers');
        aside.appendChild(header);
        aside.appendChild(ul);
        return aside;
    },
    addOne: function(data, property, cssClass, self){
        var aside = this.buildAside(data, property),
            listItem = this.buildListItem(data, property, cssClass);
        listItem.addEventListener('click', function(el){
            var aside = this.getElementsByTagName("aside")[0];
            self.events.showOneHideOthers(aside);
        });
        listItem.appendChild(aside);
        return listItem;
    },
    addAll: function(data, cssClass, self){
        var el = document.createElement('ul');
        for(var property in data){
            el.appendChild(this.addOne(data, property, cssClass, self));
        }
        return el;
    },
    render: function(target, element){
        document.getElementById(target).appendChild(element);
    },
    success: function(req, cssClass, self) {
        if (req.status >= 200 && req.status < 400){
            var data = JSON.parse(req.responseText),
                el = this.addAll(data.pages, cssClass, self);
            return el;

        } else {
            // We reached our target server, but it returned an error
            document.get("Bad Request or Server Error");
        }
    },
    onFail: function(){
        alert("Error");
    },
    updateDOM: function(target, el){
        var pageElements = document.getElementById(target).getElementsByTagName('*'),
            inMemoryElements = el.getElementsByTagName('*'),
            inMemoryElementsLength = inMemoryElements.length;

        for (var i=0, pageElementslength=pageElements.length; i<pageElementslength; i++) {
            var pageElement = pageElements[i],
                inMemoryElement = inMemoryElements[i];
            if (i >= inMemoryElementsLength){
                pageElement.parentNode.removeChild(pageElement);
            }
            else if (pageElement.firstChild.nextSibling === null){
                if (pageElement.innerHTML !== inMemoryElement.innerHTML){
                    pageElement.innerHTML = inMemoryElement.innerHTML;
                }
            }
        }
    },
    update: function(resource){
        var request = resource.service.request;

        request.onload = function(){
            var el = resource.service.success(request, app.cssClasses.page, resource);
            resource.service.updateDOM(app.javascriptTargets.pageList, el);
        };

        request.onerror = function(){
            return resource.service.onFail();
        };

        request.open(resource.service.requestMethod, resource.url(), true);
        request.send();
        return false;
    },
};
/**
 * Resource For Interacting with the API
 */
function Resource (options) {
    this.self = this;
    this.options = options || {};
    this.baseUrlParams = {
        urlPrefix: options.urlPrefix || 'http://',
        urlDomain: options.urlDomain || 'api.chartbeat.com/',
        endpoint: options.endpoint || 'live/toppages/v3/',
    };
    this.requestParams = {
        apikey: options.apikey || '317a25eccba186e0f6b558f45214c0e7',
        host: options.host || 'gizmodo.com',
    };
    this.service = new Service(this.options);
    this.events = new ResourceEvents(this.options);
}

Resource.prototype = {
    constructString: function(obj, concatFunction){
        var returnString = '',
            index = 0,
            property;
        for (property in obj){
            returnString += concatFunction(obj, property, index);
            index++;
        }
        return returnString;
    },
    constructbaseUrlParams:  function(){
        return this.constructString(this.baseUrlParams, function(obj, property, index){
            return obj[property];
        });
    },
    constructReqeustParams: function(){
        return this.constructString(this.requestParams, function(obj, property, index){
            var prefix = (index > 0) ? "&" : "?";
            return prefix+property+"="+obj[property];

        });
    },
    url: function(){
        return this.constructbaseUrlParams() +
               this.constructReqeustParams();
        },
};

/**
 * App level Object for everything related to the User
 */
function App (options) {
    this.options = options || {};
    this.el = options.el || "js--top-pages";
    this.javascriptTargets = {
        pageList: options.jsPageList || "js--top-pages__page-list",
    };
    this.cssClasses = {
        pageList: options.pageList || "top-pages__page-list",
        page: options.page || "top-pages__page",
        visitorCount: options.visitorCount || "top-pages__page__visitor-count",
        pageTitle: options.pageTitle || "top-pages__page__title",
    };
    this.updateInterval = 150;
}
var app = new App({});

app.start = function(target){
    var resource = new Resource({}),
        request = resource.service.request;

    request.onload = function(){
        var el = resource.service.success(request, app.cssClasses.page, resource),
            updateEvent = resource.events.updateEvent();
        el.setAttribute("id", app.javascriptTargets.pageList);
        el.className = app.cssClasses.pageList;
        resource.service.render(target, el);
        document.addEventListener(resource.events.updateEventName, function(){
            resource.service.update(resource);
        }, false);
        window.setInterval(function(){
            document.dispatchEvent(updateEvent);
        }, app.updateInterval);
    };

    request.onerror = function(){
        return resource.service.onFail();
    };

    request.open(resource.service.requestMethod, resource.url(), true);
    request.send();
    return false;
};

// will fire on document ready because its the last script / thing to be loaded
app.start(app.el);
