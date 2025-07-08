import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView as DashboardView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Dashboard - ${CONFIG.appName}`}</title>
      <meta name="description" content="An admin dashboard built with React and Material UI." />
      <meta name="keywords" content="react,material,dashboard,admin" />

      <DashboardView />
    </>
  );
}
