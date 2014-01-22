Name:           open-xchange-appsuite
Version:        7.2.0
%define         ox_release 0
Release:        %{ox_release}_<CI_CNT>.<B_CNT>
Group:          Applications/Productivity
Vendor:         Open-Xchange
URL:            http://open-xchange.com
Packager:       Viktor Pracht <viktor.pracht@open-xchange.com>
License:        CC-BY-NC-SA
Summary:        OX App Suite HTML5 client
Source:         %{name}_%{version}.orig.tar.bz2

BuildArch:      noarch
BuildRoot:      %{_tmppath}/%{name}-%{version}-root
BuildRequires:  nodejs >= 0.6.0

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
Group:          Applications/Productivity
Summary:        Manifest and apps included in the OX App Suite HTML5 client
Requires:       open-xchange-core
Requires(post): open-xchange-halo
Requires:       open-xchange-appsuite-l10n-en-us

%description    manifest
OX App Suite HTML5 client

This package contains the manifest for installation on the backend.

%package        dev
Group:          Development/Libraries
Summary:        SDK for the OX App Suite HTML5 client
Requires:       nodejs >= 0.6.0

%description    dev
SDK for the OX App Suite HTML5 client

## help ##
#%package       help-## lang ##
#Group:         Applications/Productivity
#Summary:       Online help for OX App Suite (## Lang ##)
#Provides:      open-xchange-appsuite-help
#
#%description   help-## lang ##
#Online help for OX App Suite (## Lang ##)
## end ##

## l10n ##
#%package       l10n-## lang ##
#Group:         Applications/Productivity
#Summary:       Translation of the OX App Suite HTML5 client (## Lang ##)
#Requires:      open-xchange-l10n-## lang ##
#Provides:      open-xchange-appsuite-l10n
#
#%description   l10n-## lang ##
#Translation of the OX App Suite HTML5 client (## Lang ##)
## end ##

%package        -n open-xchange-guidedtours
Group:          Applications/Productivity
Summary:        The default version of the guided tours for the typical applications
Requires:       open-xchange-appsuite-manifest

%description    -n open-xchange-guidedtours
The default version of the guided tours for the typical applications.

%prep
%setup -q

%build

%install
APPSUITE=/opt/open-xchange/appsuite/
sh bin/build-appsuite skipLess=1 builddir="%{buildroot}%{docroot}" \
    l10nDir=tmp/l10n manifestDir="%{buildroot}$APPSUITE" \
    version=%{version} revision=%{ox_release}
cp -r "%{buildroot}%{docroot}/apps" "%{buildroot}$APPSUITE"

mv "%{buildroot}%{docroot}/share" "%{buildroot}$APPSUITE"

find "%{buildroot}$APPSUITE" -type d \
    | sed -e 's,%{buildroot},%dir ,' > tmp/files
find "%{buildroot}$APPSUITE" \( -type f -o -type l \) \
    | sed -e 's,%{buildroot},,' >> tmp/files
## l10n ##
#find tmp/l10n \( -type f -o -type l \) -name '*.## Lang ##.js' \
#    | sed -e "s,tmp/l10n/,$APPSUITE," > tmp/files-## lang ##
## end ##
cp -r tmp/l10n/apps "%{buildroot}$APPSUITE"
mkdir -p "%{buildroot}/opt/open-xchange/etc/languages/appsuite/"
cp i18n/*.properties "%{buildroot}/opt/open-xchange/etc/languages/appsuite/"

mkdir -p "%{buildroot}/opt/open-xchange/sbin"
sed -e "s:## cd ##:cd %{docroot}:" bin/touch-appsuite > \
    "%{buildroot}/opt/open-xchange/sbin/touch-appsuite"
chmod +x "%{buildroot}/opt/open-xchange/sbin/touch-appsuite"

mkdir -p "%{buildroot}/opt/open-xchange-appsuite-dev"
cp -r bin lib Jakefile.js "%{buildroot}/opt/open-xchange-appsuite-dev/"

mkdir -p "%{buildroot}/opt/open-xchange/etc"
cp -r conf/* "%{buildroot}/opt/open-xchange/etc/"

%clean
APPSUITE=/opt/open-xchange/appsuite/
sh bin/build-appsuite clean skipLess=1 builddir="%{buildroot}%{docroot}" \
    l10nDir=tmp/l10n manifestDir="%{buildroot}$APPSUITE" \
    version=%{version} revision=%{ox_release}
rm -r "%{buildroot}/opt/open-xchange-appsuite-dev"
rm -r "%{buildroot}/opt/open-xchange/etc"

%define update /opt/open-xchange/appsuite/share/update-themes.sh

%post manifest
if [ $1 -eq 1 -a -x %{update} ]; then %{update}; fi

%postun manifest
if [ $1 -lt 1 ]; then
    rm -rf /opt/open-xchange/appsuite/apps/themes/*/less || true
else
    if [ -x %{update} ]; then %{update}; fi
fi

%triggerpostun manifest -- open-xchange-appsuite-manifest < 7.2.0
if [ -x %{update} ]; then %{update}; fi

%files
%defattr(-,root,root)
%doc readme.txt
%dir %{docroot}
%{docroot}
%exclude %{docroot}/help/l10n
%config(noreplace) %{docroot}/apps/themes/.htaccess
%dir /opt/open-xchange
%dir /opt/open-xchange/sbin
/opt/open-xchange/sbin/touch-appsuite

%files manifest -f tmp/files
%defattr(-,root,root)
%dir /opt/open-xchange

%files dev
%defattr(-,root,root)
%dir /opt/open-xchange-appsuite-dev
/opt/open-xchange-appsuite-dev
%attr(644,root,root) /opt/open-xchange-appsuite-dev/lib/sax-js/examples/switch-bench.js

## help ##
#%files help-## lang ##
#%defattr(-,root,root)
#%dir %{docroot}/help/l10n
#%{docroot}/help/l10n/## Lang ##
## end ##

## l10n ##
#%files l10n-## lang ## -f tmp/files-## lang ##
#%defattr(-,root,root)
#%dir /opt/open-xchange/etc
#%dir /opt/open-xchange/etc/languages
#%dir /opt/open-xchange/etc/languages/appsuite
#/opt/open-xchange/etc/languages/appsuite/open-xchange-appsuite-l10n-## lang ##.properties
## end ##

%files -n open-xchange-guidedtours
%defattr(-,root,root)
%dir /opt/open-xchange/appsuite/apps/io.ox/tours
/opt/open-xchange/appsuite/apps/io.ox/tours
%dir /opt/open-xchange/etc
%dir /opt/open-xchange/etc/settings
/opt/open-xchange/etc/settings/guidedtours.properties

%changelog
* Thu Nov 10 2011 viktor.pracht@open-xchange.com
  - Initial release
