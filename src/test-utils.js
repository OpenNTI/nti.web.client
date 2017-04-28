export const hookService = (o) => Object.assign(global.$AppConfig.nodeService, o);

export const setupTestClient = (service = {}) => {
	global.$AppConfig = {
		...(global.$AppConfig || {}),
		nodeService: service || {},
		nodeInterface: {
			getServiceDocument: () => Promise.resolve(global.$AppConfig.nodeService)
		}
	};
};

export const tearDownTestClient = () => {
	//unmock getService()
	const {$AppConfig} = global;
	delete $AppConfig.nodeInterface;
	delete $AppConfig.nodeService;
};
