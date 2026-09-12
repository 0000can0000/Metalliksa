/* OpenFOAM Foundation 14: conservative explicit enthalpy on an orthogonal FV mesh.
 * This is a THERMAL solver, not VOF CFD. No fabricated free-surface capability.
 * Stationary reference mass, harmonic face conductivity, exact opposite face fluxes.
 */
#include "argList.H"
#include "Time.H"
#include "fvMesh.H"
#include "volFields.H"
#include "surfaceFields.H"
#include <fstream>
#include <vector>
#include <array>
#include <algorithm>
#include <cmath>
#include <iomanip>
using namespace Foam;
using Row = std::array<double, 6>;
struct Segment { double a,b,x0,y0,x1,y1,surface; };
double interp(const std::vector<Row>& rows, double x, int xcol, int ycol)
{
    auto it = std::lower_bound(rows.begin(), rows.end(), x,
        [xcol](const Row& r,double v){ return r[xcol]<v; });
    if (it==rows.begin()) return (*it)[ycol];
    if (it==rows.end()) return rows.back()[ycol];
    const Row& a=*(it-1); const Row& b=*it;
    return a[ycol]+(b[ycol]-a[ycol])*(x-a[xcol])/(b[xcol]-a[xcol]);
}
int main(int argc, char *argv[])
{
    #include "setRootCase.H"
    #include "createTime.H"
    #include "createMesh.H"
    std::ifstream input((runTime.path()/"thermalInput.dat").c_str());
    double end,maxDt,t0,solidus,liquidus,boiling,power,radius,penetration,packing,powderK,conv,emissivity,dx,speed;
    input>>end>>maxDt>>t0>>solidus>>liquidus>>boiling>>power>>radius>>penetration>>packing>>powderK>>conv>>emissivity>>dx>>speed;
    int nrows; input>>nrows;
    std::vector<Row> table(nrows);
    for(auto& row:table) for(auto& value:row) input>>value;
    int ns; input>>ns; std::vector<Segment> scans(ns);
    for(auto& s:scans) input>>s.a>>s.b>>s.x0>>s.y0>>s.x1>>s.y1>>s.surface;
    if(!input || nrows<2 || ns<1) FatalErrorInFunction<<"Invalid thermal input"<<exit(FatalError);
    const vectorField& centres=mesh.C(); const scalarField& volumes=mesh.V();
    const labelUList& owners=mesh.owner(); const labelUList& neighbours=mesh.neighbour();
    const surfaceScalarField& areas=mesh.magSf();
    const int n=mesh.nCells();
    std::vector<double> T(n,t0),H(n,0),rho(n),k(n),rate(n),source(n),old(n);
    std::vector<bool> ever(n,false),active(n,false),wasMelt(n,false),remelt(n,false);
    const double h0=interp(table,t0,0,1), hmax=interp(table,boiling,0,1);
    for(int i=0;i<n;++i) rho[i]=interp(table,t0,0,2)*(centres[i].z()>0?packing:1.);
    std::ofstream coords((runTime.path()/"coordinates.csv").c_str());
    coords<<std::setprecision(17);
    for(int i=0;i<n;++i) coords<<centres[i].x()<<","<<centres[i].y()<<","<<centres[i].z()<<","<<volumes[i]<<"\n";
    coords.close();
    std::ofstream snapshots((runTime.path()/"snapshots.dat").c_str());
    snapshots<<std::setprecision(17);
    double time=0,ein=0,eout=0,nextSample=0,minDt=maxDt,peak=t0;
    unsigned step=0;
    double sumG=0,sumR=0,sumCooling=0,frontCount=0;
    while(time<end-1e-15)
    {
        const Segment* laser=nullptr; double surface=scans.front().surface;
        double dt=std::min({maxDt,end-time,radius/(4*speed)});
        for(const auto& s:scans)
        {
            if(s.a<=time+1e-14) surface=s.surface;
            if(s.a<=time+1e-14 && time<s.b-1e-14) laser=&s;
            if(s.a>time+1e-14) dt=std::min(dt,s.a-time);
            if(s.b>time+1e-14) dt=std::min(dt,s.b-time);
        }
        std::fill(rate.begin(),rate.end(),0); std::fill(source.begin(),source.end(),0);
        for(int i=0;i<n;++i)
        {
            active[i]=centres[i].z()<surface;
            k[i]=interp(table,T[i],0,3)*(centres[i].z()>0 && !ever[i]?powderK:1.);
            const double cp=interp(table,T[i],0,4);
            dt=std::min(dt,.12*dx*dx*rho[i]*cp/k[i]);
        }
        // Flux is power [W]. Internal exchange cancels to machine precision.
        forAll(neighbours,face)
        {
            int a=owners[face], b=neighbours[face];
            if(!active[a] || !active[b]) continue;
            const double distance=mag(centres[a]-centres[b]);
            const double flux=2*k[a]*k[b]/(k[a]+k[b])*(T[b]-T[a])/distance*areas[face];
            rate[a]+=flux; rate[b]-=flux;
        }
        double loss=0,shapeSum=0;
        double zmin=GREAT, ztop=-GREAT;
        for(int i=0;i<n;++i) if(active[i]) ztop=std::max(ztop,double(centres[i].z()));
        for(int i=0;i<n;++i) zmin=std::min(zmin,double(centres[i].z()));
        for(int i=0;i<n;++i)
        {
            if(!active[i]) continue;
            const double area=volumes[i]/dx;
            if(centres[i].z()<zmin+.1*dx)
            {
                const double q=2*k[i]*(T[i]-t0)/dx*area;
                rate[i]-=q; loss+=q;
            }
            if(centres[i].z()>ztop-.1*dx)
            {
                const double q=(conv*(T[i]-t0)+emissivity*5.670374419e-8*(std::pow(T[i],4)-std::pow(t0,4)))*area;
                rate[i]-=q; loss+=q;
            }
            if(laser)
            {
                const double f=(time-laser->a)/(laser->b-laser->a);
                const double x=(1-f)*laser->x0+f*laser->x1,y=(1-f)*laser->y0+f*laser->y1;
                source[i]=std::exp(-2*(std::pow(centres[i].x()-x,2)+std::pow(centres[i].y()-y,2))/(radius*radius)
                    -2*std::pow((centres[i].z()-surface)/penetration,2))*volumes[i];
                shapeSum+=source[i];
            }
        }
        if(laser && (!std::isfinite(shapeSum) || shapeSum<=0))
            FatalErrorInFunction<<"Gaussian source under-resolved; refine mesh"<<exit(FatalError);
        for(int i=0;i<n;++i)
        {
            source[i]=laser ? source[i]*power/shapeSum : 0;
            rate[i]+=source[i];
            dt=std::min(dt,25*rho[i]*interp(table,T[i],0,4)*volumes[i]/std::max(std::abs(rate[i]),1e-30));
        }
        minDt=std::min(minDt,dt); old=T;
        double stored=0;
        for(int i=0;i<n;++i)
        {
            H[i]+=dt*rate[i]/volumes[i];
            const double h=H[i]/rho[i]+h0;
            if(!std::isfinite(h) || h<table.front()[1]-1e-8 || h>=hmax)
                FatalErrorInFunction<<"Boiling/nonphysical enthalpy: thermal model invalid; free-surface CFD required"<<exit(FatalError);
            T[i]=interp(table,h,1,0);
            const bool molten=T[i]>=liquidus && active[i];
            remelt[i]=remelt[i] || (molten && ever[i] && !wasMelt[i]);
            ever[i]=ever[i] || molten; wasMelt[i]=molten;
            peak=std::max(peak,T[i]); stored+=H[i]*volumes[i];
        }
        time+=dt; ++step; ein+=(laser?power:0)*dt; eout+=loss*dt;
        bool crossing=false;
        for(int i=0;i<n;++i) if(old[i]>=liquidus && T[i]<liquidus) crossing=true;
        if(crossing)
        {
            std::vector<std::array<double,3>> gradient(n,{{0,0,0}}), counts(n,{{0,0,0}});
            forAll(neighbours,face)
            {
                const int a=owners[face], b=neighbours[face];
                const vector delta=centres[b]-centres[a];
                for(int axis=0;axis<3;++axis) if(std::abs(delta[axis])>dx*.5)
                {
                    const double g=(T[b]-T[a])/delta[axis];
                    gradient[a][axis]+=g; gradient[b][axis]+=g;
                    counts[a][axis]+=1; counts[b][axis]+=1;
                }
            }
            for(int i=0;i<n;++i) if(old[i]>=liquidus && T[i]<liquidus)
            {
                double g2=0;
                for(int axis=0;axis<3;++axis) g2+=std::pow(gradient[i][axis]/std::max(counts[i][axis],1.),2);
                const double g=std::sqrt(g2), cooling=(old[i]-T[i])/dt;
                if(g>1e-6) { sumG+=g; sumR+=cooling/g; sumCooling+=cooling; frontCount+=1; }
            }
        }
        if(time>=nextSample || time>=end-1e-15)
        {
            snapshots<<time<<" "<<ein<<" "<<eout<<" "<<stored<<" "<<minDt<<" "<<step<<" "<<surface<<" "<<peak
                <<" "<<sumG<<" "<<sumR<<" "<<sumCooling<<" "<<frontCount
                <<" "<<std::count(ever.begin(),ever.end(),true)<<" "<<std::count(remelt.begin(),remelt.end(),true);
            for(double t:T) snapshots<<" "<<t;
            snapshots<<"\n"; snapshots.flush();
            Info<<"THERMAL_PROGRESS "<<time/end<<" peak_K="<<peak<<" steps="<<step<<endl;
            nextSample=time+end/60;
        }
        if(step>250000) FatalErrorInFunction<<"Step budget exceeded"<<exit(FatalError);
    }
    Info<<"Thermal calculation complete; NOT free-surface CFD or validated LPBF"<<endl;
    return 0;
}
