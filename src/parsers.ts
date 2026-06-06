import { Device, MdnsService } from "./utils";

export const parseDeviceAddress = (address: string): { host: string; port: string } | undefined => {
  const matched = address.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d+)$/);
  if (!matched) {
    return undefined;
  }

  return { host: matched[1], port: matched[2] };
};

export const parseAdbDeviceLine = (line: string): Device => {
  const parts = line.split(/\s+/g);
  return { device: parts[0], model: parts[3] };
};

export const parseMdnsServices = (stdout: string): MdnsService[] => {
  const services: MdnsService[] = [];

  for (const line of stdout.split(/\n|\r\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("List of")) {
      continue;
    }

    const parts = trimmedLine.split(/\t+/);
    if (parts.length < 3) {
      continue;
    }

    const [instanceName, serviceType, endpoint] = parts;
    const endpointMatch = endpoint.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d+)$/);
    if (!endpointMatch) {
      continue;
    }

    services.push({
      instanceName,
      serviceType,
      address: endpointMatch[1],
      port: endpointMatch[2],
    });
  }

  return services;
};

export const matchesServiceName = (instanceName: string, serviceName: string): boolean => {
  return instanceName === serviceName || instanceName.startsWith(`${serviceName} `) || instanceName.startsWith(serviceName);
};

export const isConnectSuccessful = (output: string): boolean => {
  const normalizedOutput = output.toLowerCase();
  return (
    (normalizedOutput.includes("connected to") || normalizedOutput.includes("already connected")) &&
    !normalizedOutput.includes("failed to connect")
  );
};

export const isWirelessDeviceAddress = (address: string): boolean => {
  return /^(.*)((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)(:(\d+))?$/.test(address);
};

export const connectFirstAvailableEndpoint = (
  services: MdnsService[],
  preferredHost: string,
  connect: (address: string, port: string) => { stdout: string; stderr: string },
  triedEndpoints: Set<string> = new Set<string>()
): { service: MdnsService; output: string } | undefined => {
  const connectServices = services.filter(
    (service) => service.serviceType === "_adb-tls-connect._tcp" && service.address === preferredHost
  );

  for (const service of connectServices) {
    const endpoint = `${service.address}:${service.port}`;
    if (triedEndpoints.has(endpoint)) {
      continue;
    }

    triedEndpoints.add(endpoint);
    const connectResult = connect(service.address, service.port);
    const output = `${connectResult.stdout}\n${connectResult.stderr}`.trim();

    if (isConnectSuccessful(output)) {
      return { service, output };
    }
  }

  return undefined;
};
