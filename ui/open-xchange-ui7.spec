Name:           open-xchange-ui7
Version:        7.0.0
%define         ox_release 8
Release:        %{ox_release}
Group:          Applications/Productivity
Vendor:         Open-Xchange
URL:            http://open-xchange.com
Packager:       Viktor Pracht <viktor.pracht@open-xchange.com>
License:        CC-BY-NC-SA
Summary:        OX App Suite HTML5 client
Source:         %{name}_%{version}.orig.tar.bz2

BuildArch:      noarch
BuildRoot:      %{_tmppath}/%{name}-%{version}-root
BuildRequires:  nodejs >= 0.4.0

%if 0%{?suse_version}
Requires:       apache2
%endif
%if 0%{?fedora_version} || 0%{?rhel_version}
Requires:       httpd
%endif

%if 0%{?rhel_version} || 0%{?fedora_version}
%define docroot /var/www/html/appsuite
%else
%define docroot /srv/www/htdocs/appsuite
%endif

%description
OX App Suite HTML5 client

%package        manifest
Summary:        Manifest for apps included in the OX App Suite HTML5 client
Requires:       open-xchange-core

%description    manifest
OX App Suite HTML5 client

This package contains the manifest for installation on the backend.

%package        dev
Summary:        SDK for the OX App Suite HTML5 client
Requires:       nodejs >= 0.4.0

%description    dev
SDK for the OX App Suite HTML5 client

## l10n ##
#%package l10n-## lang ##
#Summary: ## Lang ## translation of the OX App Suite HTML5 client
#Requires: open-xchange-ui7
#
#%description l10n-## lang ##
### Lang ## translation of the OX App Suite HTML5 client
## end l10n ##

%prep
%setup -q

%build

%install
sh build.sh builddir="%{buildroot}%{docroot}" \
    version=%{version} revision=%{release}
mkdir -p "%{buildroot}/opt/open-xchange/ui7"
cp -r "%{buildroot}%{docroot}/apps" "%{buildroot}/opt/open-xchange/ui7/apps"
mkdir -p "%{buildroot}/opt/open-xchange-ui7-dev"
cp -r bin lib Jakefile.js "%{buildroot}/opt/open-xchange-ui7-dev/"
sed -i -e 's#OX_UI7_DEV=.*#OX_UI7_DEV="/opt/open-xchange-ui7-dev"#' \
    "%{buildroot}/opt/open-xchange-ui7-dev/bin/build-ui7"

%clean
sh build.sh clean builddir="%{buildroot}%{docroot}" version=%{version} revision=%{release}
rm -r "%{buildroot}/opt/open-xchange/ui7"
rm -r "%{buildroot}/opt/open-xchange-ui7-dev"

%files
%defattr(-,root,root)
%{docroot}
%exclude %{docroot}/apps/**/*.??_??.js
%doc readme.txt

%files manifest
%defattr(-,root,root)
%dir /opt/open-xchange
/opt/open-xchange/ui7

%files dev
%defattr(-,root,root)
%dir /opt/open-xchange-ui7-dev
/opt/open-xchange-ui7-dev
%attr(644,root,root) /opt/open-xchange-ui7-dev/lib/sax-js/examples/switch-bench.js

## l10n ##
#%files l10n-## lang ##
#%defattr(-,root,root)
#%{docroot}/apps/**/*.## Lang ##.js
## end l10n ##

%changelog
* Thu Nov 10 2011 viktor.pracht@open-xchange.com
  - Initial release
