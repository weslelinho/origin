import React, { useEffect } from 'react';
import { Role } from '@energyweb/user-registry';
import { showNotification, NotificationType } from '../utils/notifications';
import { useSelector, useDispatch } from 'react-redux';
import { getProducingDevices, getConfiguration } from '../features/selectors';
import { TableMaterial } from './Table/TableMaterial';
import { Check } from '@material-ui/icons';
import { getCurrentUser } from '../features/users/selectors';
import { setLoading } from '../features/general/actions';
import {
    IPaginatedLoaderHooksFetchDataParameters,
    usePaginatedLoader
} from './Table/PaginatedLoaderHooks';
import { ProducingDevice } from '@energyweb/device-registry';
import { getDeviceLocationText, LOCATION_TITLE_TRANSLATION_KEY } from '../utils/helper';
import { PowerFormatter } from '../utils/PowerFormatter';
import { EnergyFormatter } from '../utils/EnergyFormatter';
import { Skeleton } from '@material-ui/lab';
import { getOffChainDataSource } from '../features/general/selectors';
import {
    ICertificationRequestWithRelationsIds,
    CertificationRequestStatus
} from '@energyweb/origin-backend-core';
import { Certificate } from '@energyweb/origin';
import { useTranslation } from 'react-i18next';

interface IProps {
    status: CertificationRequestStatus;
}

interface IRecord {
    request: ICertificationRequestWithRelationsIds;
    device: ProducingDevice.Entity;
}

export function CertificationRequestsTable(props: IProps) {
    const configuration = useSelector(getConfiguration);
    const currentUser = useSelector(getCurrentUser);
    const producingDevices = useSelector(getProducingDevices);
    const offChainDataSource = useSelector(getOffChainDataSource);
    const { t } = useTranslation();

    const dispatch = useDispatch();

    async function getPaginatedData({
        requestedPageSize,
        offset
    }: IPaginatedLoaderHooksFetchDataParameters) {
        if (!currentUser || !offChainDataSource || producingDevices.length === 0) {
            return {
                paginatedData: [],
                total: 0
            };
        }

        const isIssuer = currentUser.isRole(Role.Issuer);

        const requests = await offChainDataSource.certificateClient.getCertificationRequests();

        let newPaginatedData: IRecord[] = [];

        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            const device = producingDevices.find(a => a.id === request.device.toString());

            if (
                request.status !== props.status ||
                (!isIssuer && currentUser.id.toLowerCase() !== device?.owner.address.toLowerCase())
            ) {
                continue;
            }

            newPaginatedData.push({
                request,
                device
            });
        }

        const newTotal = newPaginatedData.length;

        newPaginatedData = newPaginatedData.slice(offset, offset + requestedPageSize);

        return {
            paginatedData: newPaginatedData,
            total: newTotal
        };
    }

    const { paginatedData, loadPage, total, pageSize } = usePaginatedLoader<IRecord>({
        getPaginatedData
    });

    useEffect(() => {
        loadPage(1);
    }, [props.status, currentUser, producingDevices.length]);

    async function approve(rowIndex: number) {
        const request = paginatedData[rowIndex].request;

        dispatch(setLoading(true));

        try {
            await offChainDataSource.certificateClient.approveCertificationRequest(request.id);
            Certificate.createArbitraryCertfificate(
                request.device,
                request.energy,
                request.id,
                configuration
            );

            showNotification(`Certification request approved.`, NotificationType.Success);

            await loadPage(1);
        } catch (error) {
            showNotification(`Could not approve certification request.`, NotificationType.Error);
            console.error(error);
        }

        dispatch(setLoading(false));
    }

    if (!configuration) {
        return <Skeleton variant="rect" height={200} />;
    }

    const actions =
        currentUser?.isRole(Role.Issuer) && props.status === CertificationRequestStatus.Pending
            ? [
                  {
                      icon: <Check />,
                      name: 'Approve',
                      onClick: (row: number) => approve(row)
                  }
              ]
            : [];

    const columns = [
        { id: 'facility', label: 'Facility' },
        { id: 'locationText', label: t(LOCATION_TITLE_TRANSLATION_KEY) },
        { id: 'type', label: 'Type' },
        { id: 'capacity', label: `Capacity (${PowerFormatter.displayUnit})` },
        { id: 'meterRead', label: `Meter Read (${EnergyFormatter.displayUnit})` },
        { id: 'files', label: 'Evidence files' }
    ] as const;

    const rows = paginatedData.map(({ device, request }) => {
        return {
            facility: device.offChainProperties.facilityName,
            locationText: getDeviceLocationText(device),
            type: configuration.deviceTypeService.getDisplayText(
                device.offChainProperties.deviceType
            ),
            capacity: PowerFormatter.format(device.offChainProperties.capacityInW),
            meterRead: EnergyFormatter.format(request.energy),
            files: request.files.map(f => (
                <div key={f}>
                    <a
                        href={offChainDataSource.filesClient.getLink(f)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {f}
                    </a>
                </div>
            ))
        };
    });

    return (
        <TableMaterial
            columns={columns}
            rows={rows}
            loadPage={loadPage}
            total={total}
            pageSize={pageSize}
            actions={actions}
        />
    );
}
