import * as React from "react";
import * as ReactDOM from "react-dom";
import { CreateRuntimeMapFeatureFlags, IMapGuideClient } from "../api/request-builder";
import { RuntimeMap } from "../api/contracts/runtime-map";
import { TaskPane } from "./task-pane";
import { MapViewer, IMapViewer } from "./map-viewer";
import { Legend, MapElementChangeFunc } from "./legend";
import { ClientContext, ClientKind } from "../api/client";
import { IMapView, IApplicationContext, APPLICATION_CONTEXT_VALIDATION_MAP } from "./context";
import { AjaxViewerShim } from "../api/ajax-viewer-shim";
import { SelectionPanel } from "./selection-panel";
import { Toolbar, DEFAULT_TOOLBAR_HEIGHT, IItem } from "./toolbar";

export interface IApplicationProps {
    /**
     * Agent configuration 
     * 
     * @type {{
     *         uri: string,
     *         kind?: ClientKind
     *     }}
     */
    agent: {
        uri: string,
        kind?: ClientKind
    },
    /**
     * A resource id to a Map Definition or Application Definition. If passing a Map Definition,
     * a default viewer layout will be created 
     * 
     * @type {string}
     */
    resourceId: string;
}

const SIDEBAR_WIDTH = 250;
const PROPERTY_PALETTE_HEIGHT = 450;

/**
 * Application is the root component of a MapGuide viewer application
 */
export class Application extends React.Component<IApplicationProps, any> implements IApplicationContext {
    fnLegendMounted: (component) => void;
    fnMapViewerMounted: (component) => void;
    fnTaskPaneMounted: (component) => void;
    fnGroupVisibilityChanged: MapElementChangeFunc;
    fnLayerVisibilityChanged: MapElementChangeFunc;
    fnViewChanged: (view: IMapView) => void;
    fnSelectionChange: (selectionSet: any) => void;
    fnZoomToSelectedFeature: (feature: any) => void;
    _viewer: any;
    _legend: Legend;
    _taskpane: TaskPane;
    private commands: IItem[]; 
    clientContext: ClientContext;
    static childContextTypes = APPLICATION_CONTEXT_VALIDATION_MAP;
    constructor(props) {
        super(props);
        this.fnLegendMounted = this.onLegendMounted.bind(this);
        this.fnMapViewerMounted = this.onMapViewerMounted.bind(this);
        this.fnTaskPaneMounted = this.onTaskPaneMounted.bind(this);
        this.fnViewChanged = this.onViewChanged.bind(this);
        this.fnGroupVisibilityChanged = this.onGroupVisibilityChanged.bind(this);
        this.fnLayerVisibilityChanged = this.onLayerVisibilityChanged.bind(this);
        this.fnSelectionChange = this.onSelectionChange.bind(this);
        this.fnZoomToSelectedFeature = this.onZoomToSelectedFeature.bind(this);
        this.state = {
            selection: null,
            runtimeMap: null,
            error: null
        };
        this.commands = [
            { icon: "zoom-in-fixed.png", tooltip: "Zoom In" },
            { icon: "zoom-out-fixed.png", tooltip: "Zoom Out" },
            { icon: "buffer.png", tooltip: "Buffer", invoke: () => this._taskpane.loadUrl("/mapguide/mapviewernet/bufferui.aspx") },
            { icon: "measure.png", tooltip: "Measure", invoke: () => this._taskpane.loadUrl("/mapguide/mapviewernet/measureui.aspx") },
            { icon: "print.png", tooltip: "Quick Plot", invoke: () => this._taskpane.loadUrl("/mapguide/mapviewernet/quickplotpanel.aspx") }
        ];
    }
    getChildContext(): IApplicationContext {
        return {
            getClient: this.getClient.bind(this),
            getSession: this.getSession.bind(this),
            getMapName: this.getMapName.bind(this),
            getLocale: this.getLocale.bind(this)
        };
    }
    //-------- IApplicationContext --------//
    getClient(): IMapGuideClient {
        return this.clientContext.agent;
    }
    getSession(): string {
        const runtimeMap: RuntimeMap = this.state.runtimeMap;
        if (runtimeMap != null) {
            return runtimeMap.SessionId;
        }
        return null;
    }
    getMapName(): string {
        const runtimeMap: RuntimeMap = this.state.runtimeMap;
        if (runtimeMap != null) {
            return runtimeMap.Name;
        }
        return null;
    }
    getLocale(): string {
        return "en";
    }
    //-------------------------------------//
    componentDidMount() {
        const { agent } = this.props;
        this.clientContext = new ClientContext(agent.uri, agent.kind);
        this.clientContext.agent.createRuntimeMap({
            mapDefinition: this.props.resourceId,
            requestedFeatures: CreateRuntimeMapFeatureFlags.LayerFeatureSources | CreateRuntimeMapFeatureFlags.LayerIcons | CreateRuntimeMapFeatureFlags.LayersAndGroups,
            username: "Anonymous"
        }).then(res => {
            this.setState({ runtimeMap: res });
        }).catch(err => {
            this.setState({ runtimeMap: null, error: err });
        });
    }
    render(): JSX.Element {
        const { runtimeMap, selection } = this.state;
        if (runtimeMap) {
            const sel = selection ? selection.SelectedFeatures : null;
            return <div style={{ width: "100%", height: "100%" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH, overflowY: "auto" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, right: 0 }}>
                        <Legend ref={this.fnLegendMounted}
                                        map={this.state.runtimeMap} 
                                        onGroupVisibilityChanged={this.fnGroupVisibilityChanged}
                                        onLayerVisibilityChanged={this.fnLayerVisibilityChanged} />
                    </div>
                    <div style={{ position: "absolute", left: 0, bottom: 0, right: 0, height: PROPERTY_PALETTE_HEIGHT }}>
                        <SelectionPanel selection={sel}
                                        onRequestZoomToFeature={this.fnZoomToSelectedFeature} />
	                </div>
                </div>
                <div style={{ position: "absolute", left: SIDEBAR_WIDTH, top: 0, bottom: 0, right: SIDEBAR_WIDTH }}>
                    <Toolbar childItems={this.commands} containerStyle={{ position: "absolute", left: 10, top: 10, height: DEFAULT_TOOLBAR_HEIGHT, zIndex: 100, backgroundColor: "#f0f0f0" }} />
                    <MapViewer ref={this.fnMapViewerMounted}
                               map={this.state.runtimeMap} 
                               agentUri={this.props.agent.uri}
                               onViewChanged={this.fnViewChanged}
                               onSelectionChange={this.fnSelectionChange}
                               imageFormat="PNG" />
                </div>
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: SIDEBAR_WIDTH }}>
                    <TaskPane ref={this.fnTaskPaneMounted} initialUrl="/mapguide/localized/help/en/mapguide_viewer_command_list.htm" />
                </div>
            </div>;
        } else {
            if (this.state.error != null) {
                return <div>
                    <h3>An error occurred while loading this application</h3>
                    <pre>
                        {this.state.error.message}
                    </pre>
                </div>;
            } else {
                return <div>Loading Map ...</div>;
            }
        }
    }
    private getViewer(): IMapViewer {
        var viewer = this._viewer.refs['wrappedInstance'];
        return viewer;
    }
    onZoomToSelectedFeature(feature: any) {

    }
    onSelectionChange(selectionSet: any) {
        this.setState({ selection: selectionSet });
    }
    onLegendMounted(legend: Legend) {
        this._legend = legend;
    }
    onMapViewerMounted(component) {
        this._viewer = component;
    }
    onTaskPaneMounted(component) {
        this._taskpane = component;
    }
    onGroupVisibilityChanged(groupId: string, visible: boolean) {
        const viewer = this.getViewer();
        if (viewer != null)
            viewer.setGroupVisibility(groupId, visible);
    }
    onLayerVisibilityChanged(layerId: string, visible: boolean) {
        const viewer = this.getViewer();
        if (viewer != null)
            viewer.setLayerVisibility(layerId, visible);
    }
    onViewChanged(view: IMapView) {
        if (this._legend != null)
            this._legend.setState({ currentScale: view.scale });
    }
}

/**
 * This is the entry point to the Application component
 */
export class ApplicationViewModel {
    constructor() {

    }
    public mount(node: Element, props: IApplicationProps) {
        const app: Application = ReactDOM.render(<Application {...props}/>, node) as Application;
        const win: any = window;
        AjaxViewerShim.install(win, app);
    }
}