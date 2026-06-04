/*
const API_BASE_URL = 'http://10.0.2.2:8080/api';

export default {
    API_BASE_URL
};
*/

import { Platform } from 'react-native';

const getBaseUrl = () => {



    const PC_IP = '10.0.2.2';

    if (Platform.OS === 'android') {

        return `http://${PC_IP}:8080/api`;
    }

    return `http://localhost:8080/api`;
};

export const API_BASE_URL = getBaseUrl();

