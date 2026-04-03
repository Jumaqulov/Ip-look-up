import React, { useMemo, useState } from 'react';
import axios from 'axios';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import {
    AlertCircle,
    ArrowUpRight,
    Building2,
    Clock3,
    Globe,
    Landmark,
    LocateFixed,
    MapPinned,
    Network,
    Orbit,
    Radar,
    Search,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

import MapUpdater from './MapUpdater';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
} from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SAMPLE_IPS = ['8.8.8.8', '1.1.1.1', '208.67.222.222'];
const LOCATION_RADIUS_METERS = 320;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const flag = (code) =>
    code?.length === 2
        ? code.toUpperCase().split('').map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join('')
        : '';

const flagUrl = (code) => (code?.length === 2 ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : '');

const coord = (value) => (typeof value === 'number' ? value.toFixed(4) : '-');

const metricsFor = (data) => [
    {
        label: 'Country',
        value: data.country_name || 'Unknown',
        countryCode: data.country_code || '',
        meta: [data.city, data.region].filter(Boolean).join(', ') || 'Location unavailable',
        icon: Globe,
    },
    {
        label: 'Network',
        value: data.network || '-',
        meta: data.org || 'Organization unavailable',
        icon: Network,
    },
    {
        label: 'Timezone',
        value: data.timezone || '-',
        meta: data.utc_offset || 'Offset unavailable',
        icon: Clock3,
    },
];

function FlagMark({ code, name, className = 'size-10 rounded-full object-cover ring-1 ring-black/8' }) {
    const [failed, setFailed] = useState(false);

    if (!code || code.length !== 2) {
        return null;
    }

    if (failed) {
        return (
            <span aria-hidden="true" className="text-2xl leading-none">
                {flag(code)}
            </span>
        );
    }

    return (
        <img
            src={flagUrl(code)}
            alt={`${name || code} flag`}
            className={className}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
}

function LoadingState() {
    return (
        <section className="grid gap-8">
            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/72">
                <div className="grid gap-0 md:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className="flex flex-col gap-4 p-6 md:not-last:border-r md:border-border/70">
                            <Skeleton className="h-4 w-24 rounded-full" />
                            <Skeleton className="h-8 w-40 rounded-full" />
                            <Skeleton className="h-4 w-44 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[2rem] border border-border/70 bg-card/72 p-6">
                    <div className="grid gap-4">
                        {[0, 1, 2, 3].map((item) => (
                            <Skeleton key={item} className="h-16 w-full rounded-[1.25rem]" />
                        ))}
                    </div>
                </div>
                <div className="rounded-[2rem] border border-border/70 bg-card/72 p-6">
                    <Skeleton className="h-[320px] w-full rounded-[1.5rem]" />
                </div>
            </div>
        </section>
    );
}

export default function Home() {
    const [ip, setIp] = useState('');
    const [data, setData] = useState(null);
    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const metrics = useMemo(
        () =>
            data
                ? metricsFor(data)
                : metricsFor({
                      country_code: '',
                      country_name: 'Public IP only',
                      city: 'City level lookup',
                      region: 'Region context',
                      network: 'ASN & subnet',
                      org: 'Org fingerprint',
                      timezone: 'Timezone match',
                      utc_offset: 'UTC insight',
                  }),
        [data]
    );

    const rows = useMemo(
        () =>
            data
                ? [
                      ['IP address', data.ip],
                      ['Version', data.version],
                      ['Country', `${flag(data.country_code)} ${data.country_name || '-'}`],
                      ['Region', data.region || '-'],
                      ['City', data.city || '-'],
                      ['Postal code', data.postal || '-'],
                      ['Organization', data.org || '-'],
                      ['ASN', data.asn || '-'],
                      ['Network', data.network || '-'],
                      ['Timezone', data.timezone || '-'],
                      ['UTC offset', data.utc_offset || '-'],
                      ['Latitude', coord(data.latitude)],
                      ['Longitude', coord(data.longitude)],
                  ]
                : [],
        [data]
    );

    const search = async (forced) => {
        const query = (forced ?? ip).trim();
        if (!query) {
            setError('Enter an IP address.');
            setData(null);
            setPosition(null);
            return;
        }

        setIp(query);
        setLoading(true);
        setError('');

        try {
            const res = await axios.get(`https://ipapi.co/${query}/json/`);
            if (res.data.error) {
                setData(null);
                setPosition(null);
                setError(res.data.reason || 'Bu IP bo\'yicha ma\'lumot topilmadi.');
                return;
            }
            setData(res.data);
            setPosition(
                res.data.latitude !== undefined && res.data.longitude !== undefined
                    ? [res.data.latitude, res.data.longitude]
                    : null
            );
        } catch (requestError) {
            console.error(requestError);
            setData(null);
            setPosition(null);
            setError('Request failed. Try again with another public IP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-shell min-h-svh">
            <a
                href="#lookup-main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
                Skip to main content
            </a>

            <div className="mx-auto flex min-h-svh max-w-[88rem] flex-col gap-8 px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_rgba(34,49,93,0.75)]">
                            <Radar className="size-5" />
                        </div>
                        <div>
                            <div className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-muted-foreground">Ip Look Up</div>
                            <div className="font-heading text-lg tracking-tight">Public signal tracing</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline"><ShieldCheck data-icon="inline-start" />Browser-safe lookup</Badge>
                        <Badge variant="secondary"><Orbit data-icon="inline-start" />Live map sync</Badge>
                    </div>
                </header>

                <section className="hero-panel overflow-hidden rounded-[2.5rem] px-5 py-6 text-white sm:px-7 sm:py-8 lg:px-10 lg:py-10">
                    <div className="grid gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(24rem,0.72fr)]">
                        <div className="flex flex-col justify-between gap-8">
                            <div className="space-y-6 reveal-up">
                                <Badge variant="outline" className="border-white/15 bg-white/6 text-white">
                                    <Sparkles data-icon="inline-start" />Editorial console
                                </Badge>
                                <div className="space-y-4">
                                    <h1 className="max-w-3xl font-heading text-4xl leading-none tracking-tight text-balance sm:text-5xl lg:text-7xl">
                                        Find the real-world context behind a public IP.
                                    </h1>
                                    <p className="max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                                        Country, network, timezone, and live map context all come together in one focused workspace.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-5 reveal-up reveal-delay-1">
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="ip-search" className="text-white">IP address</FieldLabel>
                                        <FieldContent>
                                            <InputGroup className="h-14 rounded-[1.5rem] border-white/12 bg-white/9 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                                <InputGroupAddon align="inline-start">
                                                    <InputGroupText className="text-white/70"><Search />Query</InputGroupText>
                                                </InputGroupAddon>
                                                <InputGroupInput
                                                    id="ip-search"
                                                    name="ip_address"
                                                    autoComplete="off"
                                                    inputMode="text"
                                                    value={ip}
                                                    placeholder="Example: 8.8.8.8..."
                                                    className="h-14 text-base text-white placeholder:text-white/42"
                                                    onChange={(e) => setIp(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && search()}
                                                />
                                                <InputGroupAddon align="inline-end">
                                                    <InputGroupButton type="button" size="sm" variant="secondary" disabled={loading} onClick={() => search()}>
                                                        {loading ? <Spinner data-icon="inline-start" /> : <LocateFixed data-icon="inline-start" />}
                                                        {loading ? 'Searching...' : 'Search'}
                                                    </InputGroupButton>
                                                </InputGroupAddon>
                                            </InputGroup>
                                        </FieldContent>
                                        <FieldDescription className="text-white/58">
                                            Private IP ranges cannot be geolocated. Try a public IP instead.
                                        </FieldDescription>
                                    </Field>
                                </FieldGroup>

                                <div className="flex flex-wrap gap-2">
                                    {SAMPLE_IPS.map((sample) => (
                                        <Button
                                            key={sample}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                                            onClick={() => search(sample)}
                                        >
                                            <ArrowUpRight data-icon="inline-start" />{sample}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="reveal-up reveal-delay-2">
                                <div className="grid gap-0 overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/6 sm:grid-cols-3">
                                    {metrics.map((item, index) => {
                                        const Icon = item.icon;
                                        return (
                                            <article key={item.label} className={`flex min-w-0 flex-col gap-2 px-5 py-4 ${index !== 2 ? 'sm:border-r sm:border-white/10' : ''}`}>
                                                <div className="flex items-center gap-2 text-white/62"><Icon className="size-4" /><span className="text-xs uppercase tracking-[0.24em]">{item.label}</span></div>
                                                <div className="min-w-0 truncate font-heading text-lg tracking-tight">{item.value}</div>
                                                <div className="min-w-0 truncate text-sm text-white/58">{item.meta}</div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="reveal-up reveal-delay-2">
                            {position && data ? (
                                <div className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                    <MapContainer center={position} zoom={13} style={{ height: '470px', width: '100%' }}>
                                        <MapUpdater position={position} />
                                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Circle
                                            center={position}
                                            radius={LOCATION_RADIUS_METERS}
                                            pathOptions={{
                                                color: '#dc2626',
                                                weight: 1.5,
                                                opacity: 0.9,
                                                dashArray: '6 6',
                                                fillColor: '#ef4444',
                                                fillOpacity: 0.1,
                                            }}
                                        />
                                        <Marker position={position}><Popup>{data.city}, {data.country_name}</Popup></Marker>
                                    </MapContainer>
                                </div>
                            ) : (
                                <div className="signal-stage flex min-h-[470px] items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/6 px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                    <div className="signal-ring signal-ring-lg" />
                                    <div className="signal-ring signal-ring-md" />
                                    <div className="signal-ring signal-ring-sm" />
                                    <div className="signal-dot" />
                                    <div className="relative z-10 flex max-w-md flex-col items-center gap-5 rounded-[1.75rem] border border-white/14 bg-white/8 px-8 py-7 text-center text-white backdrop-blur-xl">
                                        <Badge variant="outline" className="border-white/18 bg-white/8 text-white"><Radar data-icon="inline-start" />Awaiting target</Badge>
                                        <div className="space-y-2">
                                            <h2 className="font-heading text-3xl leading-none tracking-tight text-balance">Search a public IP to light up the stage.</h2>
                                            <p className="text-sm leading-6 text-white/72">Once a result arrives, this panel becomes a live geolocation viewport and the marker flies to the new coordinates.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {error && (
                    <Alert aria-live="polite" className="rounded-[1.75rem] border-amber-300/70 bg-card/80 shadow-[0_24px_80px_-60px_rgba(180,83,9,0.45)]">
                        <AlertCircle />
                        <AlertTitle>Lookup blocked</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <main id="lookup-main" className="flex flex-col gap-8">
                    {loading ? (
                        <LoadingState />
                    ) : data ? (
                        <>
                            <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/72 shadow-[0_30px_100px_-76px_rgba(17,24,39,0.45)]">
                                <div className="grid gap-0 md:grid-cols-3">
                                    {metrics.map((item, index) => {
                                        const Icon = item.icon;
                                        return (
                                            <article key={item.label} className={`flex min-w-0 flex-col gap-3 px-6 py-6 ${index !== 2 ? 'md:border-r md:border-border/70' : ''}`}>
                                                <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /><span className="text-xs uppercase tracking-[0.24em]">{item.label}</span></div>
                                                {item.label === 'Country' ? (
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <FlagMark code={item.countryCode} name={item.value} />
                                                        <h2 className="min-w-0 text-2xl font-heading tracking-tight text-balance">{item.value}</h2>
                                                    </div>
                                                ) : (
                                                    <h2 className="min-w-0 text-2xl font-heading tracking-tight text-balance">{item.value}</h2>
                                                )}
                                                <p className="min-w-0 text-sm leading-6 text-muted-foreground">{item.meta}</p>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                <article className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/72 shadow-[0_30px_100px_-76px_rgba(17,24,39,0.45)]">
                                    <div className="flex flex-col gap-6 p-6 sm:p-8">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div className="space-y-2">
                                                <Badge variant="outline">Location dossier</Badge>
                                                <div className="flex items-center gap-3">
                                                    <FlagMark
                                                        code={data.country_code}
                                                        name={data.country_name}
                                                        className="size-11 rounded-full object-cover ring-1 ring-black/8"
                                                    />
                                                    <h2 className="font-heading text-3xl tracking-tight text-balance">{data.country_name}</h2>
                                                </div>
                                                <p className="text-base leading-7 text-muted-foreground">{data.city || 'Unknown city'}, {data.region || 'Unknown region'}</p>
                                            </div>
                                            <div className="rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-muted-foreground">
                                                {coord(data.latitude)}, {coord(data.longitude)}
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="rounded-[1.5rem] bg-background/80 p-5">
                                                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPinned className="size-4" />Regional focus</div>
                                                <div className="font-medium">{data.region || '-'}</div>
                                                <div className="text-sm text-muted-foreground">Postal: {data.postal || '-'}</div>
                                            </div>
                                            <div className="rounded-[1.5rem] bg-background/80 p-5">
                                                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />Time reference</div>
                                                <div className="font-medium">{data.timezone || '-'}</div>
                                                <div className="text-sm text-muted-foreground">Offset: {data.utc_offset || '-'}</div>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="overflow-hidden rounded-[1.75rem] border border-border/70">
                                            <Table>
                                                <TableHeader><TableRow><TableHead className="w-[220px]">Field</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {rows.slice(0, 7).map(([label, value]) => (
                                                        <TableRow key={label}>
                                                            <TableCell className="font-medium text-foreground/80">{label}</TableCell>
                                                            <TableCell className="whitespace-normal text-muted-foreground">{value || '-'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </article>

                                <article className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/72 shadow-[0_30px_100px_-76px_rgba(17,24,39,0.45)]">
                                    <div className="flex flex-col gap-6 p-6 sm:p-8">
                                        <div className="space-y-2">
                                            <Badge variant="secondary">Network dossier</Badge>
                                            <h2 className="font-heading text-3xl tracking-tight text-balance">Operator & routing profile</h2>
                                            <p className="text-base leading-7 text-muted-foreground">ASN, organization, and subnet details are organized for quick reading at a glance.</p>
                                        </div>

                                        <div className="grid gap-4">
                                            <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-5">
                                                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Landmark className="size-4" />Organization</div>
                                                <div className="text-lg font-medium text-balance">{data.org || '-'}</div>
                                            </div>
                                            <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-5">
                                                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Network className="size-4" />Subnet block</div>
                                                <div className="text-lg font-medium">{data.network || '-'}</div>
                                            </div>
                                            <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-5">
                                                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="size-4" />ASN reference</div>
                                                <div className="text-lg font-medium">{data.asn || '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            </section>

                            <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/72 shadow-[0_30px_100px_-76px_rgba(17,24,39,0.45)]">
                                <div className="flex flex-col gap-6 p-6 sm:p-8">
                                    <div className="space-y-2">
                                        <Badge variant="outline">Raw fields</Badge>
                                        <h2 className="font-heading text-3xl tracking-tight text-balance">Full lookup payload</h2>
                                    </div>

                                    <div className="overflow-hidden rounded-[1.75rem] border border-border/70">
                                        <Table>
                                            <TableHeader><TableRow><TableHead className="w-[220px]">Field</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {rows.slice(7).map(([label, value]) => (
                                                    <TableRow key={label}>
                                                        <TableCell className="font-medium text-foreground/80">{label}</TableCell>
                                                        <TableCell className="whitespace-normal text-muted-foreground">{value || '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </section>
                        </>
                    ) : (
                        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                            <article className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/72 p-6 shadow-[0_30px_100px_-76px_rgba(17,24,39,0.45)] sm:p-8">
                                <Badge variant="outline">What appears after search</Badge>
                                <h2 className="mt-3 font-heading text-3xl tracking-tight text-balance">A calmer, more editorial reading of network data.</h2>
                                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">After a search, the signal strip, location dossier, network profile, and raw lookup fields appear here.</p>
                            </article>
                            <article className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/72 p-6 shadow-[0_30px_100px_-76px_rgba(17,24,39,0.45)] sm:p-8">
                                <Badge variant="secondary">Quick notes</Badge>
                                <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                                    <p>Public IP only. Local network addresses cannot be geolocated.</p>
                                    <p>The lookup returns city-level context, subnet details, and timezone data.</p>
                                    <p>The map viewport updates inside the hero as the dominant visual stage.</p>
                                </div>
                            </article>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}
