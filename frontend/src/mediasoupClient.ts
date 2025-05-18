import * as mediasoupClient from 'mediasoup-client';
import ws from './socket';

let device: mediasoupClient.Device;

export const loadDevice = async (rtpCapabilities: any) => {
  device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities: rtpCapabilities });
  console.log('Device loaded');
  return device;
};